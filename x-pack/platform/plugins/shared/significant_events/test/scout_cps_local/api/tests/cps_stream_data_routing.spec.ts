/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { EsClient } from '@kbn/scout';
import { significantEventsCpsApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';

const CPS_LINKED_INDEX = 'logs-cps-se-ki-test';
const VIEW_PREFIX = '$.';
const ROOT_STREAM = 'logs.otel';
const PARENT_STREAM = `${ROOT_STREAM}.cpsse`;
const QUERY_STREAM = `${PARENT_STREAM}.qs`;
const PARENT_VIEW = `${VIEW_PREFIX}${PARENT_STREAM}`;

const NOW = Date.now();
const WINDOW_START = NOW - 10 * 60_000;
const WINDOW_END = NOW + 60 * 60_000;

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
    index: CPS_LINKED_INDEX,
    refresh: 'wait_for',
    body: {
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

    apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
      const credentials = await samlAuth.asStreamsAdmin();
      cookieHeader = credentials.cookieHeader;

      await apiServices.streamsTest.enableQueryStreams();

      await apiServices.streamsTest.forkStream(ROOT_STREAM, PARENT_STREAM, {
        field: 'service.name',
        eq: 'cps-se-test',
      });

      await apiServices.streamsTest.createEsqlView(PARENT_VIEW, `FROM ${CPS_LINKED_INDEX}`);

      await apiServices.streamsTest.createQueryStream(
        QUERY_STREAM,
        `FROM ${PARENT_VIEW} | KEEP @timestamp, cps_se_marker, message, \`service.name\``
      );
    });

    apiTest.afterAll(async ({ apiServices, linkedProject }) => {
      await apiServices.streamsTest.deleteEsqlView(PARENT_VIEW);
      await apiServices.streamsTest.cleanupTestStreams(PARENT_STREAM);
      await apiServices.streamsTest.disableQueryStreams();
      await linkedProject.esClient.indices.delete({ index: CPS_LINKED_INDEX }, { ignore: [404] });
    });

    apiTest(
      'samples stream data from a linked CPS project during computed KI identification',
      async ({ apiClient, esClient, linkedProject }) => {
        await ingestMarkerOnLinked(
          linkedProject.esClient,
          markerValue,
          new Date(NOW - 5 * 60_000).toISOString()
        );

        // Negative control: origin-only routing must not see linked-only data.
        const originHits = await esClient.search({
          index: CPS_LINKED_INDEX,
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
          (feature) => feature.type === 'log_samples'
        );
        expect(logSamples).toBeDefined();
        expect(JSON.stringify(logSamples?.properties)).toContain(markerValue);
      }
    );
  }
);
