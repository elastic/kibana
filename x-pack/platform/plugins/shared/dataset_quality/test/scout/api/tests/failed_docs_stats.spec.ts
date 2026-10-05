/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import type { FailedDocsDetails } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import {
  buildDataStreamName,
  createComponentTemplate,
  createFailedLogRecord,
  createIndexTemplate,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  deletePipelineIfExists,
  getLogsForDataset,
  logLevelNormalizationProcessors,
  refreshFailureStore,
} from '../../common';

/** Every resource is prefixed for this spec only, so no other suite can leak into it. */
const DATASET = 'dq.fd.stats';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const PIPELINE_NAME = 'dq-fd-stats@pipeline';
const COMPONENT_TEMPLATE_NAME = 'dq-fd-stats@mappings';
const INDEX_TEMPLATE_NAME = DATA_STREAM;

const INGEST_TO = '2025-05-19T18:01:00.000Z';

/**
 * A failure-store document carries the timestamp of the ingest failure, not the
 * `@timestamp` of the document that failed, so the query window has to cover
 * "now". The upper bound is a fixed far-future date to keep requests deterministic.
 */
const QUERY_START = '2025-05-19T18:00:00.000Z';
const QUERY_END = '2100-01-01T00:00:00.000Z';

const failedDocsStatsUrl = (): string =>
  `${testData.API.failedDocsStats(DATA_STREAM)}?${new URLSearchParams({
    start: QUERY_START,
    end: QUERY_END,
  }).toString()}`;

const sumTimeSeries = (timeSeries: FailedDocsDetails['timeSeries']): number =>
  timeSeries.reduce((total, { y }) => total + y, 0);

apiTest.describe(
  'Dataset quality - failed docs timeseries of a data stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      // The pipeline rejects any `log.level` outside the accepted set, which is
      // how documents get routed into the failure store.
      await esClient.ingest.putPipeline({
        id: PIPELINE_NAME,
        processors: logLevelNormalizationProcessors,
      });
      await createComponentTemplate(esClient, {
        name: COMPONENT_TEMPLATE_NAME,
        dataStreamOptions: { failure_store: { enabled: true } },
      });
      await createIndexTemplate(esClient, {
        name: INDEX_TEMPLATE_NAME,
        indexPatterns: [DATA_STREAM],
        composedOf: [COMPONENT_TEMPLATE_NAME, 'logs@mappings', 'logs@settings', 'ecs@mappings'],
        defaultPipeline: PIPELINE_NAME,
      });
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE_NAME, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE_NAME, log);
      await deletePipelineIfExists(esClient, PIPELINE_NAME, log);
    });

    apiTest(
      'returns an empty timeseries while every document passes the ingest pipeline',
      async ({ apiClient, logsSynthtraceEsClient }) => {
        // Runs before any failing document exists, so the failure store of the
        // data stream has no backing index at all.
        await logsSynthtraceEsClient.index(
          getLogsForDataset({ dataset: DATASET, to: INGEST_TO, count: 1 })
        );

        const response = await apiClient.get(failedDocsStatsUrl(), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const details = response.body as FailedDocsDetails;
        expect(details.count).toBe(0);
        expect(details.lastOccurrence).toBeUndefined();
        expect(details.timeSeries).toHaveLength(0);
      }
    );

    apiTest(
      'returns the count, the last occurrence and the timeseries of the failed documents',
      async ({ apiClient, esClient, logsSynthtraceEsClient }) => {
        // Failure-store ingest and its refresh are genuinely slow.
        apiTest.setTimeout(120_000);

        await logsSynthtraceEsClient.index(
          createFailedLogRecord({ dataset: DATASET, to: INGEST_TO, count: 1 })
        );
        await refreshFailureStore(esClient, DATA_STREAM);

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(failedDocsStatsUrl(), {
                headers: adminHeaders,
                responseType: 'json',
              });
              return (response.body as FailedDocsDetails).count;
            },
            { timeout: 60_000, intervals: [2_000] }
          )
          .toBe(1);

        const response = await apiClient.get(failedDocsStatsUrl(), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const details = response.body as FailedDocsDetails;
        expect(details.lastOccurrence).toBeGreaterThan(0);
        // The single failure has to show up in exactly one histogram bucket.
        expect(sumTimeSeries(details.timeSeries)).toBe(1);
      }
    );
  }
);
