/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

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
} from '../../common';

/**
 * Its own file, and its own prefixed resources, because the scenario needs a closed
 * failure-store backing index — cluster state that would leak into any sibling suite
 * sharing the data stream. The FTR expressed this as a nested `describe` whose `before`
 * hook seeded and closed; Playwright's lint forbids nested describes, so the block
 * becomes a file.
 */
const FAILING_DATASET = 'dq.fdclosed.fail';
const HEALTHY_DATASET = 'dq.fdclosed.ok';
const FAILING_DATA_STREAM = buildDataStreamName({ dataset: FAILING_DATASET });
const HEALTHY_DATA_STREAM = buildDataStreamName({ dataset: HEALTHY_DATASET });
const FAILURE_STORE = `${FAILING_DATA_STREAM}::failures`;
const PIPELINE_NAME = 'dq-fdclosed@pipeline';
const COMPONENT_TEMPLATE_NAME = 'dq-fdclosed@mappings';
const INDEX_TEMPLATE_NAME = FAILING_DATA_STREAM;

const INGEST_TO = '2025-05-19T18:01:00.000Z';

/**
 * A failure-store document carries the timestamp of the ingest failure, not the
 * `@timestamp` of the document that failed, so the query window has to cover "now".
 */
const QUERY_START = '2025-05-19T18:00:00.000Z';
const QUERY_END = '2100-01-01T00:00:00.000Z';

const failedDocsUrl = (): string =>
  `${testData.API.FAILED_DOCS}?${new URLSearchParams({
    types: 'logs',
    start: QUERY_START,
    end: QUERY_END,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - failed docs in a closed failure store index',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient, samlAuth }) => {
      // Failure-store ingest and its refresh are genuinely slow.
      apiTest.setTimeout(180_000);

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      // The pipeline rejects any `log.level` outside the accepted set, which is how
      // documents get routed into the failure store.
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

      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ dataset: HEALTHY_DATASET, to: INGEST_TO, count: 1 }),
        createFailedLogRecord({ dataset: FAILING_DATASET, to: INGEST_TO, count: 1 }),
      ]);
      await refreshFailureStore(esClient, FAILING_DATA_STREAM);

      // Closing before the first backing index exists fails with a misleading error, so
      // wait for it here rather than relying on an assertion elsewhere having run.
      await expect
        .poll(async () => countFailureStoreIndices(esClient, FAILURE_STORE), {
          timeout: 60_000,
          intervals: [2_000],
        })
        .toBeGreaterThan(0);

      await closeDataStream(esClient, FAILURE_STORE);
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, FAILING_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, HEALTHY_DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE_NAME, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE_NAME, log);
      await deletePipelineIfExists(esClient, PIPELINE_NAME, log);
    });

    apiTest('skips failed documents held in a closed index', async ({ apiClient }) => {
      const response = await apiClient.get(failedDocsUrl(), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.failedDocs).toStrictEqual([]);
    });
  }
);
