/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { EsClient } from '@kbn/scout';
import { LOG_SAMPLES_FEATURE_TYPE } from '@kbn/significant-events-schema';
import { significantEventsCpsApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';

// A `logs-*` name so CPS resolves the same unqualified name on the origin and the linked project.
// The built-in `logs` template is data-stream-only, so this has to be created as a data stream
// through a dedicated higher-priority template rather than as a plain index.
const CPS_TEST_DATA_STREAM = 'logs-cps-se-ki-test';
const CPS_TEST_TEMPLATE = 'cps-se-ki-test-template';
// A classic parent lets the query stream `FROM` the data stream directly. Chaining an
// intermediate `$.…` parent view under CPS is a known fragile shape; origin view over real
// cross-project indices is the supported one.
const QUERY_STREAM = `${CPS_TEST_DATA_STREAM}.qs`;

const NOW = Date.now();
const WINDOW_START = NOW - 10 * 60_000;
const WINDOW_END = NOW + 60 * 60_000;

/**
 * Cross-project ES|QL resolves a field once across all projects, so leaving either copy to
 * dynamic mapping would make `cps_se_marker` a `text` field on one side and a `keyword` on the
 * other, and `KEEP` would then fail on the conflicting column type.
 */
const CPS_DATA_STREAM_MAPPINGS: estypes.MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    cps_se_marker: { type: 'keyword' },
    message: { type: 'text' },
    service: { properties: { name: { type: 'keyword' } } },
  },
};

interface ComputedFeature {
  type: string;
  properties: Record<string, unknown>;
}

interface IdentifyComputedResponse {
  computedFeatures: ComputedFeature[];
  computedFeaturesCount: number;
}

async function deleteTestDataStream(esClient: EsClient) {
  await esClient.indices.deleteDataStream({ name: CPS_TEST_DATA_STREAM }, { ignore: [404] });
  await esClient.indices.deleteIndexTemplate({ name: CPS_TEST_TEMPLATE }, { ignore: [404] });
}

async function ensureTestDataStream(esClient: EsClient) {
  // Recreate from scratch so a run that crashed before its teardown doesn't fail this one.
  await deleteTestDataStream(esClient);
  await esClient.indices.putIndexTemplate({
    name: CPS_TEST_TEMPLATE,
    index_patterns: [CPS_TEST_DATA_STREAM],
    data_stream: {},
    // Higher than the built-in `logs` template so the explicit field types win.
    priority: 1000,
    template: { mappings: CPS_DATA_STREAM_MAPPINGS },
  });
  await esClient.indices.createDataStream({ name: CPS_TEST_DATA_STREAM });
}

async function ingestMarkerOnLinked(
  linkedEsClient: EsClient,
  markerValue: string,
  timestamp: string
) {
  await linkedEsClient.index({
    index: CPS_TEST_DATA_STREAM,
    refresh: 'wait_for',
    document: {
      '@timestamp': timestamp,
      cps_se_marker: markerValue,
      message: `CPS significant events marker ${markerValue}`,
      'service.name': 'cps-se-test',
    },
  });
}

apiTest.describe(
  'Significant Events CPS stream data routing (linked serverless project)',
  { tag: tags.serverless.observability.complete },
  () => {
    const markerValue = `cps_marker_${Date.now()}`;
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, streamsTest, esClient, linkedProject }) => {
      // Built-in admin, matching the entity_store CPS suite: this suite covers space-based
      // stream data routing, not Streams RBAC.
      const credentials = await samlAuth.asInteractiveUser('admin');
      cookieHeader = credentials.cookieHeader;

      await streamsTest.enableQueryStreams();

      // The data stream has to exist on both projects before the query stream is created, because
      // Kibana validates the desired stream state by running the ES|QL query against the origin
      // project and rejects an unknown index. The origin copy deliberately stays empty: every
      // matching document lives on the linked project, so the marker can only reach the identify
      // response if the read fans out across projects.
      await ensureTestDataStream(esClient);
      await ensureTestDataStream(linkedProject.esClient);

      await streamsTest.createStream(CPS_TEST_DATA_STREAM, {
        dashboards: [],
        rules: [],
        stream: {
          description: 'CPS significant events test classic stream',
          type: 'classic',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            failure_store: { inherit: {} },
            classic: {},
          },
        },
      });

      await streamsTest.createQueryStream(
        QUERY_STREAM,
        `FROM ${CPS_TEST_DATA_STREAM} | KEEP @timestamp, cps_se_marker, message, \`service.name\``
      );
    });

    apiTest.afterAll(async ({ streamsTest, esClient, linkedProject }) => {
      await streamsTest.cleanupTestStreams(CPS_TEST_DATA_STREAM);
      await streamsTest.disableQueryStreams();
      await deleteTestDataStream(esClient);
      await deleteTestDataStream(linkedProject.esClient);
    });

    apiTest(
      'samples stream data from a linked CPS project during computed KI identification',
      async ({ apiClient, esClient, linkedProject }) => {
        await ingestMarkerOnLinked(
          linkedProject.esClient,
          markerValue,
          new Date(NOW - 5 * 60_000).toISOString()
        );

        // Negative control: the origin copy of the data stream is empty, so an origin-only read
        // cannot see the marker. This is what makes the assertions below evidence of
        // cross-project routing rather than of the data simply being available locally.
        const originHits = await esClient.search({
          index: CPS_TEST_DATA_STREAM,
          query: { term: { cps_se_marker: markerValue } },
        });
        expect(originHits.hits.hits).toHaveLength(0);

        const { statusCode, body } = await apiClient.post(
          `internal/streams/${QUERY_STREAM}/features/_identify/computed`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              start: WINDOW_START,
              end: WINDOW_END,
            },
            responseType: 'json',
          }
        );

        expect(statusCode, `identify/computed failed: ${JSON.stringify(body)}`).toBe(200);

        const response: IdentifyComputedResponse = body;

        // Only the marker proves the read fanned out: every generator contributes a feature even
        // when it sampled nothing, so the feature count stays positive for an origin-only read of
        // the empty origin data stream and cannot tell the two cases apart.
        expect(
          JSON.stringify(response.computedFeatures),
          `expected the linked project marker in the computed features; got ${JSON.stringify(
            response.computedFeatures
          )}`
        ).toContain(markerValue);

        const logSamples = response.computedFeatures.find(
          (feature) => feature.type === LOG_SAMPLES_FEATURE_TYPE
        );
        expect(
          logSamples,
          `no ${LOG_SAMPLES_FEATURE_TYPE} feature in ${JSON.stringify(response.computedFeatures)}`
        ).toBeDefined();
        expect(
          JSON.stringify(logSamples?.properties),
          `expected the linked project marker in the log samples; got ${JSON.stringify(
            logSamples?.properties
          )}`
        ).toContain(markerValue);
      }
    );
  }
);
