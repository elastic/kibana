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
  closeDataStream,
  countFailureStoreIndices,
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
  rolloverDataStream,
} from '../../common';

/**
 * Covers a failure store with one closed backing index and one open: only the documents
 * in the open index are counted. Kept in its own file with its own prefixed resources —
 * the FTR nested this inside the closed-index block, which Playwright's lint forbids,
 * and the closed index is cluster state no sibling suite should inherit.
 */
const FAILING_DATASET = 'dq.fdroll.fail';
const HEALTHY_DATASET = 'dq.fdroll.ok';
const FAILING_DATA_STREAM = buildDataStreamName({ dataset: FAILING_DATASET });
const HEALTHY_DATA_STREAM = buildDataStreamName({ dataset: HEALTHY_DATASET });
const FAILURE_STORE = `${FAILING_DATA_STREAM}::failures`;
const PIPELINE_NAME = 'dq-fdroll@pipeline';
const COMPONENT_TEMPLATE_NAME = 'dq-fdroll@mappings';
const INDEX_TEMPLATE_NAME = FAILING_DATA_STREAM;

const INGEST_TO = '2025-05-19T18:01:00.000Z';

const QUERY_START = '2025-05-19T18:00:00.000Z';
const QUERY_END = '2100-01-01T00:00:00.000Z';

const failedDocsUrl = (): string =>
  `${testData.API.FAILED_DOCS}?${new URLSearchParams({
    types: 'logs',
    start: QUERY_START,
    end: QUERY_END,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - failed docs after a failure store rollover',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient, samlAuth }) => {
      apiTest.setTimeout(180_000);

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

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

      // First document: ends up in the backing index that is then closed.
      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ dataset: HEALTHY_DATASET, to: INGEST_TO, count: 1 }),
        createFailedLogRecord({ dataset: FAILING_DATASET, to: INGEST_TO, count: 1 }),
      ]);
      await refreshFailureStore(esClient, FAILING_DATA_STREAM);
      await expect
        .poll(async () => countFailureStoreIndices(esClient, FAILURE_STORE), {
          timeout: 60_000,
          intervals: [2_000],
        })
        .toBeGreaterThan(0);
      await closeDataStream(esClient, FAILURE_STORE);

      // Second document: lands in the new backing index opened by the rollover.
      await rolloverDataStream(esClient, FAILURE_STORE);
      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ dataset: HEALTHY_DATASET, to: INGEST_TO, count: 1 }),
        createFailedLogRecord({ dataset: FAILING_DATASET, to: INGEST_TO, count: 1 }),
      ]);
      await refreshFailureStore(esClient, FAILING_DATA_STREAM);
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, FAILING_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, HEALTHY_DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE_NAME, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE_NAME, log);
      await deletePipelineIfExists(esClient, PIPELINE_NAME, log);
    });

    apiTest('counts only the documents in the open index', async ({ apiClient }) => {
      apiTest.setTimeout(120_000);

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
    });
  }
);
