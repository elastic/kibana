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

const CPS_TEST_INDEX = 'logs-cps-se-ki-test';
const VIEW_PREFIX = '$.';
const ROOT_STREAM = 'logs.otel';
const PARENT_STREAM = `${ROOT_STREAM}.cpsse`;
const QUERY_STREAM = `${PARENT_STREAM}.qs`;
const PARENT_VIEW = `${VIEW_PREFIX}${PARENT_STREAM}`;

const NOW = Date.now();
const WINDOW_START = NOW - 10 * 60_000;
const WINDOW_END = NOW + 60 * 60_000;

/**
 * Both copies of the test index are created up front with identical mappings. Cross-project
 * ES|QL resolves a field once across all projects, so letting one copy be dynamically mapped
 * would make `cps_se_marker` a `text` field on one side and a `keyword` on the other, and the
 * `KEEP` clause would then fail on a conflicting column type.
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
      const credentials = await samlAuth.asStreamsAdmin();
      cookieHeader = credentials.cookieHeader;

      await streamsTest.enableQueryStreams();

      await streamsTest.forkStream(ROOT_STREAM, PARENT_STREAM, {
        field: 'service.name',
        eq: 'cps-se-test',
      });

      // The index has to exist on both projects before the query stream is created, because
      // Kibana validates the desired stream state by running the ES|QL query against the origin
      // project and rejects an unknown index. The origin copy deliberately stays empty: every
      // matching document lives on the linked project, so the marker can only reach the identify
      // response if the read fans out across projects.
      await esClient.indices.create({ index: CPS_TEST_INDEX, mappings: CPS_INDEX_MAPPINGS });
      await linkedProject.esClient.indices.create({
        index: CPS_TEST_INDEX,
        mappings: CPS_INDEX_MAPPINGS,
      });

      await streamsTest.createEsqlView(PARENT_VIEW, `FROM ${CPS_TEST_INDEX}`);

      await streamsTest.createQueryStream(
        QUERY_STREAM,
        `FROM ${PARENT_VIEW} | KEEP @timestamp, cps_se_marker, message, \`service.name\``
      );
    });

    apiTest.afterAll(async ({ streamsTest, esClient, linkedProject }) => {
      await streamsTest.deleteEsqlView(PARENT_VIEW);
      await streamsTest.cleanupTestStreams(PARENT_STREAM);
      await streamsTest.disableQueryStreams();
      await esClient.indices.delete({ index: CPS_TEST_INDEX }, { ignore: [404] });
      await linkedProject.esClient.indices.delete({ index: CPS_TEST_INDEX }, { ignore: [404] });
    });

    apiTest(
      'samples stream data from a linked CPS project during computed KI identification',
      async ({ apiClient, esClient, linkedProject }) => {
        await ingestMarkerOnLinked(
          linkedProject.esClient,
          markerValue,
          new Date(NOW - 5 * 60_000).toISOString()
        );

        // Negative control: the origin copy of the index is empty, so an origin-only read cannot
        // see the marker. This is what makes the assertions below evidence of cross-project
        // routing rather than of the data simply being available locally.
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

        expect(statusCode).toBe(200);

        const response = body as IdentifyComputedResponse;
        expect(response.computedFeaturesCount).toBeGreaterThan(0);

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
