/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import type { DataStreamDocsStat } from '../../../../common/api_types';
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
  indexLogs,
  logLevelNormalizationProcessors,
  refreshFailureStore,
} from '../../common';

/**
 * Resource names are prefixed for this spec only: the failure-store suites all
 * used to share one component template / pipeline / index template, which let
 * state leaked by one file silently change the behaviour of the next.
 */
const FAILING_DATASET = 'dq.fd.fail';
const HEALTHY_DATASET = 'dq.fd.ok';
const FAILING_DATA_STREAM = buildDataStreamName({ dataset: FAILING_DATASET });
const HEALTHY_DATA_STREAM = buildDataStreamName({ dataset: HEALTHY_DATASET });
const PIPELINE_NAME = 'dq-fd@pipeline';
const COMPONENT_TEMPLATE_NAME = 'dq-fd@mappings';
const INDEX_TEMPLATE_NAME = FAILING_DATA_STREAM;

const INGEST_TO = '2025-05-19T18:01:00.000Z';

/**
 * A failure-store document carries the timestamp of the ingest failure, not the
 * `@timestamp` of the document that failed, so the query window has to cover
 * "now". The upper bound is a fixed far-future date to keep requests deterministic.
 */
const QUERY_START = '2025-05-19T18:00:00.000Z';
const QUERY_END = '2100-01-01T00:00:00.000Z';

const failedDocsUrl = (): string =>
  `${testData.API.FAILED_DOCS}?${new URLSearchParams({
    // The API takes an A-Rison (comma separated) list of data stream types.
    types: 'logs',
    start: QUERY_START,
    end: QUERY_END,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - failed docs per data stream',
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
        indexPatterns: [FAILING_DATA_STREAM],
        composedOf: [COMPONENT_TEMPLATE_NAME, 'logs@mappings', 'logs@settings', 'ecs@mappings'],
        defaultPipeline: PIPELINE_NAME,
      });
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, FAILING_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, HEALTHY_DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE_NAME, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE_NAME, log);
      await deletePipelineIfExists(esClient, PIPELINE_NAME, log);
    });

    apiTest('returns an empty list while no document has been ingested', async ({ apiClient }) => {
      const response = await apiClient.get(failedDocsUrl(), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.failedDocs).toStrictEqual([]);
    });

    apiTest(
      'reports the failed documents of the only data stream that has them',
      async ({ apiClient, esClient, logsSynthtraceEsClient }) => {
        // Failure-store ingest and its refresh are genuinely slow.
        apiTest.setTimeout(120_000);

        await indexLogs(logsSynthtraceEsClient, [
          getLogsForDataset({ dataset: HEALTHY_DATASET, to: INGEST_TO, count: 1 }),
          createFailedLogRecord({ dataset: FAILING_DATASET, to: INGEST_TO, count: 1 }),
        ]);
        await refreshFailureStore(esClient, FAILING_DATA_STREAM);

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(failedDocsUrl(), {
                headers: adminHeaders,
                responseType: 'json',
              });
              return response.body.failedDocs as DataStreamDocsStat[];
            },
            { timeout: 60_000, intervals: [2_000] }
          )
          .toStrictEqual([{ dataset: FAILING_DATA_STREAM, count: 1 }]);
      }
    );
  }
);
