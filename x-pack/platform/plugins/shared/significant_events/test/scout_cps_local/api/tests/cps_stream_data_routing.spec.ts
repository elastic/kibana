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

// `logs-*` data stream so CPS can resolve the same unqualified name on origin + linked.
// The matching `logs` template is data-stream-only, so we create an explicit data stream
// (with our own higher-priority template) rather than a plain index.
const CPS_TEST_INDEX = 'logs-cps-se-ki-test';
const CPS_TEST_TEMPLATE = 'cps-se-ki-test-template';
// Classic parent so the query stream can `FROM` the data stream directly (no intermediate
// `$.…` parent view). Nested view → view → index under CPS is a known fragile edge;
// origin view → real indices across projects is the supported shape.
const QUERY_STREAM = `${CPS_TEST_INDEX}.qs`;

const NOW = Date.now();
const WINDOW_START = NOW - 10 * 60_000;
const WINDOW_END = NOW + 60 * 60_000;

/**
 * Both copies of the test data stream are created up front with identical mappings.
 * Cross-project ES|QL resolves a field once across all projects, so letting one copy be
 * dynamically mapped would make `cps_se_marker` a `text` field on one side and a `keyword` on
 * the other, and the `KEEP` clause would then fail on a conflicting column type.
 */
const CPS_INDEX_MAPPINGS: estypes.MappingTypeMapping = {
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

async function ensureTestDataStream(esClient: EsClient) {
  await esClient.indices.putIndexTemplate({
    name: CPS_TEST_TEMPLATE,
    index_patterns: [CPS_TEST_INDEX],
    data_stream: {},
    // Higher than the built-in `logs` template so our explicit field types win.
    priority: 1000,
    template: { mappings: CPS_INDEX_MAPPINGS },
  });
  await esClient.indices.createDataStream({ name: CPS_TEST_INDEX });
}

async function deleteTestDataStream(esClient: EsClient) {
  await esClient.indices.deleteDataStream({ name: CPS_TEST_INDEX }, { ignore: [404] });
  await esClient.indices.deleteIndexTemplate({ name: CPS_TEST_TEMPLATE }, { ignore: [404] });
}

async function ingestMarkerOnLinked(
  linkedEsClient: EsClient,
  markerValue: string,
  timestamp: string
) {
  await linkedEsClient.index({
    index: CPS_TEST_INDEX,
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
      // Built-in admin (same as entity_store CPS): this suite proves space-based stream-data
      // routing, not Streams RBAC.
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

      await streamsTest.createStream(CPS_TEST_INDEX, {
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
        `FROM ${CPS_TEST_INDEX} | KEEP @timestamp, cps_se_marker, message, \`service.name\``
      );
    });

    apiTest.afterAll(async ({ streamsTest, esClient, linkedProject }) => {
      await streamsTest.cleanupTestStreams(CPS_TEST_INDEX);
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
          index: CPS_TEST_INDEX,
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

        const response = body as IdentifyComputedResponse;
        expect(
          response.computedFeaturesCount,
          `expected computed features from linked CPS data; got ${JSON.stringify(response)}`
        ).toBeGreaterThan(0);

        const serializedFeatures = JSON.stringify(response.computedFeatures);
        expect(serializedFeatures).toContain(markerValue);

        const logSamples = response.computedFeatures.find(
          (feature) => feature.type === LOG_SAMPLES_FEATURE_TYPE
        );
        expect(logSamples).toBeDefined();
        expect(JSON.stringify(logSamples?.properties)).toContain(markerValue);
      }
    );
  }
);
