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
  createFailedLogRecord,
  createComponentTemplate,
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

/** Every resource is prefixed so this spec cannot collide with the other suites. */
const DATASET = 'synth.faileddocs';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const PIPELINE = 'synth-faileddocs@pipeline';
const COMPONENT_TEMPLATE = 'synth-faileddocs@custom';
const INDEX_TEMPLATE = 'synth-faileddocs';

/**
 * Failure-store documents are stamped with the time the failure occurred rather than
 * the timestamp of the rejected document, so this data has to be recent enough for the
 * default `now-24h` window to see it. A fixed past window would find nothing.
 */
const TO = new Date().toISOString();

/** The Field column renders this label for the failed-docs quality issue. */
const FAILED_DOCS_FIELD = 'Failed documents';

test.describe(
  'Dataset quality details failed docs',
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
        // 2 timestamps x 2 rejected documents = 4 failed docs.
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

    test('reports the failed docs in the summary KPIs and as a single quality issue', async ({
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({ dataStream: DATA_STREAM });

      await expect
        .poll(async () => (await pageObjects.datasetQualityDetails.getSummaryKpis()).failedDocs)
        .toBe('4');

      await expect(pageObjects.datasetQualityDetails.qualityIssuesTable).toBeVisible();

      await expect
        .poll(async () => pageObjects.datasetQualityDetails.getQualityIssueNames())
        .toStrictEqual([FAILED_DOCS_FIELD]);

      const [row] = await pageObjects.datasetQualityDetails.parseQualityIssuesTable();
      expect(row[testData.QUALITY_ISSUE_COLUMNS.issue]).toBe(
        testData.TEXTS.documentsIndexingFailed
      );

      // One spark plot per row, as for degraded fields.
      await expect(pageObjects.datasetQualityDetails.getSparkPlots()).toHaveCount(1);
    });

    test('reflects the selected quality issue chart in the URL and opens the failure store in Discover', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({ dataStream: DATA_STREAM });

      await pageObjects.datasetQualityDetails.selectQualityIssueChart('failed');

      // The Discover link is rebuilt from the URL state, so wait for the chart
      // selection to land there before following it.
      await expect
        .poll(async () => decodeURIComponent(page.url()))
        .toContain('qualityIssuesChart:failed');

      // Hovering first keeps the Lens visualisation below from popping its own action
      // icons over the link and swallowing the click.
      await pageObjects.datasetQualityDetails.linkToDiscover.hover();
      await pageObjects.datasetQualityDetails.linkToDiscover.click();

      await expect
        .poll(async () => decodeURIComponent(page.url()))
        .toContain(`FROM ${DATA_STREAM}::failures`);
      expect(decodeURIComponent(page.url())).toContain('esql');
      expect(page.url()).toContain('/app/discover');
    });

    test('opens and closes the failed docs flyout', async ({ page, pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({ dataStream: DATA_STREAM });

      // The plugin renders this test subject on two nested elements, so the label is
      // matched inside the flyout instead of through the ambiguous subject.
      const errorMessages =
        pageObjects.datasetQualityDetails.degradedFieldFlyout.getByText('Error messages');

      await test.step('opens the flyout from the row expand button', async () => {
        await pageObjects.datasetQualityDetails.openQualityIssueFlyout(FAILED_DOCS_FIELD);

        await expect(pageObjects.datasetQualityDetails.degradedFieldFlyout).toBeVisible();
        await expect(errorMessages).toBeVisible();
      });

      await test.step('re-opens the flyout from the URL state', async () => {
        await expect
          .poll(async () => decodeURIComponent(page.url()))
          .toContain('expandedQualityIssue:(name:failedDocs,type:failed)');

        await page.reload();

        await expect(pageObjects.datasetQualityDetails.degradedFieldFlyout).toBeVisible();
        await expect(errorMessages).toBeVisible();
      });

      await test.step('closes the flyout again', async () => {
        await pageObjects.datasetQualityDetails.closeFlyout();

        await expect(pageObjects.datasetQualityDetails.degradedFieldFlyout).toBeHidden();
      });
    });

    test('opens Discover in ES|QL mode from the flyout', async ({ page, pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({ dataStream: DATA_STREAM });

      await pageObjects.datasetQualityDetails.openQualityIssueFlyout(FAILED_DOCS_FIELD);

      await page.testSubj.click('datasetQualityDetailsDegradedFieldFlyoutTitleLinkToDiscover');

      await expect
        .poll(async () => decodeURIComponent(page.url()))
        .toContain(`FROM ${DATA_STREAM}::failures`);
      expect(decodeURIComponent(page.url())).toContain('esql');
      expect(page.url()).toContain('/app/discover');
    });
  }
);
