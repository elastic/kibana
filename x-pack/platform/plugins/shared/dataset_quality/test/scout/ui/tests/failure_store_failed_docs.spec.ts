/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test, testData } from '../fixtures';
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
 * The scenarios that need documents to actually land in the failure store, so both
 * depend on `refreshFailureStore`. The panels, modal and table link — which only need
 * the failure store enabled or disabled — live in failure_store.spec.ts.
 */
const DATASET = 'synth.fscount';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });

const PIPELINE = 'synth-fscount@pipeline';
const COMPONENT_TEMPLATE = 'synth-fscount@custom';
const INDEX_TEMPLATE = 'synth-fscount';

/**
 * Failure-store documents carry the timestamp of the failure rather than that of the
 * rejected document, so the data has to be recent enough for the default `now-24h`
 * window to see it.
 */
const TO = new Date().toISOString();

test.describe(
  'Dataset quality failure store - failed docs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, logsSynthtraceEsClient }) => {
      // The painless script throws for any unexpected `log.level`, which is how
      // `createFailedLogRecord` gets its documents rejected into the failure store.
      await esClient.ingest.putPipeline({
        id: PIPELINE,
        processors: logLevelNormalizationProcessors,
      });
      await createComponentTemplate(esClient, {
        name: COMPONENT_TEMPLATE,
        dataStreamOptions: { failure_store: { enabled: true } },
      });
      await createIndexTemplate(esClient, {
        name: INDEX_TEMPLATE,
        indexPatterns: [`logs-${DATASET}-*`],
        composedOf: ['logs@mappings', 'logs@settings', 'ecs@mappings', COMPONENT_TEMPLATE],
        priority: 501,
        defaultPipeline: PIPELINE,
      });

      await indexLogs(logsSynthtraceEsClient, [
        // 2 timestamps x 2 rejected documents = 4 failed docs, against 16 good ones.
        createFailedLogRecord({ to: TO, count: 2, dataset: DATASET }),
        getLogsForDataset({ to: TO, count: 4, dataset: DATASET }),
      ]);
      await refreshFailureStore(esClient, DATA_STREAM);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE, log);
      await deletePipelineIfExists(esClient, PIPELINE, log);
    });

    test('shows the failed docs count on the details page', async ({ pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({ dataStream: DATA_STREAM });

      const card = pageObjects.datasetQualityDetails.getSummaryCard('Failed documents');
      await expect(card).toBeVisible();
      await expect(card).not.toContainText(testData.TEXTS.noFailureStore);

      await expect
        .poll(async () => (await pageObjects.datasetQualityDetails.getSummaryKpis()).failedDocs)
        .toBe('4');
    });

    test('renders the failed docs percentage in the table', async ({ pageObjects }) => {
      await pageObjects.datasetQuality.goto();

      const rows = await pageObjects.datasetQuality.parseTable();
      const failedDocsByDataset = new Map(
        rows.map((row) => [
          row[testData.TABLE_COLUMNS.name],
          row[testData.TABLE_COLUMNS.failedDocs],
        ])
      );

      // 4 failed of 20 total. A data stream without a failure store reports "N/A"
      // instead, which is asserted by failure_store.spec.ts.
      expect(failedDocsByDataset.get(DATASET)).toBe('20%');
    });
  }
);
