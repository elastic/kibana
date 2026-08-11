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
  cannotReadFailureStoreRole,
  cleanUpAll,
  createComponentTemplate,
  createFailedLogRecord,
  createIndexTemplate,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  deletePipelineIfExists,
  disableFailureStoreIfExists,
  getLogsForDataset,
  indexLogs,
  logLevelNormalizationProcessors,
  refreshFailureStore,
} from '../../common';

/**
 * Failure-store documents carry the timestamp of the failure rather than the timestamp
 * of the rejected document, so the data has to be recent enough for the default
 * `now-24h` window to see it.
 */
const TO = new Date().toISOString();

/** Every resource below is prefixed so this spec owns its cluster state outright. */
const ENABLED_DATASET = 'synth.fsenabled';
const ENABLED_DATA_STREAM = buildDataStreamName({ dataset: ENABLED_DATASET });
/** Toggled on and back off by the details-page scenario. */
const DISABLED_DATASET = 'synth.fsdisabled';
const DISABLED_DATA_STREAM = buildDataStreamName({ dataset: DISABLED_DATASET });
/** Toggled on by the list-page scenario, which is why it is a separate data set. */
const TABLE_DATASET = 'synth.fstable';
const TABLE_DATA_STREAM = buildDataStreamName({ dataset: TABLE_DATASET });

const PIPELINE = 'synth-failurestore@pipeline';
const ENABLED_COMPONENT_TEMPLATE = 'synth-failurestore-on@custom';
const DISABLED_COMPONENT_TEMPLATE = 'synth-failurestore-off@custom';
const ENABLED_INDEX_TEMPLATE = 'synth-failurestore-on';
const DISABLED_INDEX_TEMPLATE = 'synth-failurestore-off';

const SHARED_COMPONENTS = ['logs@mappings', 'logs@settings', 'ecs@mappings'];

test.describe(
  'Dataset quality failure store',
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
        name: ENABLED_COMPONENT_TEMPLATE,
        dataStreamOptions: { failure_store: { enabled: true } },
      });
      await createComponentTemplate(esClient, {
        name: DISABLED_COMPONENT_TEMPLATE,
        dataStreamOptions: { failure_store: { enabled: false } },
      });

      await createIndexTemplate(esClient, {
        name: ENABLED_INDEX_TEMPLATE,
        indexPatterns: [`logs-${ENABLED_DATASET}-*`],
        composedOf: [...SHARED_COMPONENTS, ENABLED_COMPONENT_TEMPLATE],
        priority: 501,
        defaultPipeline: PIPELINE,
      });
      await createIndexTemplate(esClient, {
        name: DISABLED_INDEX_TEMPLATE,
        indexPatterns: [`logs-${DISABLED_DATASET}-*`, `logs-${TABLE_DATASET}-*`],
        composedOf: [...SHARED_COMPONENTS, DISABLED_COMPONENT_TEMPLATE],
        priority: 501,
        defaultPipeline: PIPELINE,
      });

      await indexLogs(logsSynthtraceEsClient, [
        // 2 timestamps x 2 rejected documents = 4 failed docs in the failure store.
        createFailedLogRecord({ to: TO, count: 2, dataset: ENABLED_DATASET }),
        getLogsForDataset({ to: TO, count: 4, dataset: ENABLED_DATASET }),
        getLogsForDataset({ to: TO, count: 4, dataset: DISABLED_DATASET }),
        getLogsForDataset({ to: TO, count: 4, dataset: TABLE_DATASET }),
      ]);
      await refreshFailureStore(esClient, ENABLED_DATA_STREAM);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      // Ordered, and every step runs even if an earlier one throws: a data stream the
      // setup never created would otherwise abort the hook here and leak the templates
      // and pipeline into the shared stack.
      await cleanUpAll([
        // These tests flip the failure store through the UI, so put every data stream
        // back to the state its template describes before tearing anything down.
        ...[DISABLED_DATA_STREAM, TABLE_DATA_STREAM].map(
          (name) => () => disableFailureStoreIfExists(esClient, name, log)
        ),
        ...[ENABLED_DATA_STREAM, DISABLED_DATA_STREAM, TABLE_DATA_STREAM].map(
          (name) => () => deleteDataStreamIfExists(esClient, name, log)
        ),
        () => deleteIndexTemplateIfExists(esClient, ENABLED_INDEX_TEMPLATE, log),
        () => deleteIndexTemplateIfExists(esClient, DISABLED_INDEX_TEMPLATE, log),
        () => deleteComponentTemplateIfExists(esClient, ENABLED_COMPONENT_TEMPLATE, log),
        () => deleteComponentTemplateIfExists(esClient, DISABLED_COMPONENT_TEMPLATE, log),
        () => deletePipelineIfExists(esClient, PIPELINE, log),
      ]);
    });

    test('hides the failed docs card from a user without failure store privileges', async ({
      browserAuth,
      pageObjects,
    }) => {
      // The only scenario that needs an under-privileged user. Each Scout test gets a
      // fresh context, so this login cannot leak into the other tests.
      await browserAuth.loginWithCustomRole(cannotReadFailureStoreRole);

      for (const dataStream of [DISABLED_DATA_STREAM, ENABLED_DATA_STREAM]) {
        await test.step(`falls back to "No failure store" for ${dataStream}`, async () => {
          await pageObjects.datasetQualityDetails.goto({ dataStream });

          const card = pageObjects.datasetQualityDetails.getSummaryCard('noFailureStore');
          await expect(card).toBeVisible();
          await expect(card).toContainText(testData.TEXTS.noFailureStore);
        });
      }
    });

    test('shows the "No failure store" card when the failure store is disabled', async ({
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({ dataStream: DISABLED_DATA_STREAM });

      const card = pageObjects.datasetQualityDetails.getSummaryCard('noFailureStore');
      await expect(card).toBeVisible();
      await expect(card).toContainText(testData.TEXTS.noFailureStore);
      await expect(
        pageObjects.datasetQualityDetails.getSummaryCard('Failed documents')
      ).toBeHidden();
    });

    test('enables the failure store from the details page and disables it again', async ({
      pageObjects,
    }) => {
      const noFailureStoreCard = pageObjects.datasetQualityDetails.getSummaryCard('noFailureStore');
      const failedDocsCard = pageObjects.datasetQualityDetails.getSummaryCard('Failed documents');

      await pageObjects.datasetQualityDetails.goto({ dataStream: DISABLED_DATA_STREAM });

      await test.step('enables the failure store from the disabled card', async () => {
        await expect(noFailureStoreCard).toBeVisible();
        await expect(failedDocsCard).toBeHidden();

        await pageObjects.datasetQualityDetails.enableFailureStoreButton.click();
        await pageObjects.datasetQualityDetails.failureStoreModal.waitFor({ state: 'visible' });

        // Saving stays disabled until something actually changes.
        await expect(pageObjects.datasetQualityDetails.failureStoreModalSaveButton).toBeDisabled();

        await pageObjects.datasetQualityDetails.enableFailureStoreToggle.click();
        await expect(pageObjects.datasetQualityDetails.failureStoreModalSaveButton).toBeEnabled();

        await pageObjects.datasetQualityDetails.saveFailureStoreChanges();

        await expect(failedDocsCard).toBeVisible();
        await expect(failedDocsCard).toContainText('Failed documents');
        await expect(noFailureStoreCard).toBeHidden();
      });

      await test.step('disables it again through the edit action', async () => {
        // The edit icon only renders while the failed documents chart is selected.
        await pageObjects.datasetQualityDetails.selectQualityIssueChart('failed');

        await pageObjects.datasetQualityDetails.openFailureStoreModal();
        await pageObjects.datasetQualityDetails.enableFailureStoreToggle.click();
        await expect(pageObjects.datasetQualityDetails.failureStoreModalSaveButton).toBeEnabled();

        await pageObjects.datasetQualityDetails.saveFailureStoreChanges();

        await expect(noFailureStoreCard).toBeVisible();
        await expect(noFailureStoreCard).toContainText(testData.TEXTS.noFailureStore);
      });
    });

    test('offers "Set failure store" from the table and removes the link once enabled', async ({
      pageObjects,
    }) => {
      await pageObjects.datasetQuality.goto();

      const setFailureStoreLink =
        pageObjects.datasetQuality.getSetFailureStoreLink(TABLE_DATA_STREAM);

      await test.step('swaps the "N/A" label for a call to action on hover', async () => {
        await expect(setFailureStoreLink).toHaveText('N/A');

        await setFailureStoreLink.hover();

        await expect(setFailureStoreLink).toHaveText(testData.TEXTS.setFailureStore);
      });

      await test.step('enables the failure store through the modal', async () => {
        await setFailureStoreLink.click();
        // The failure store modal is shared between the list and the details page.
        await pageObjects.datasetQualityDetails.failureStoreModal.waitFor({ state: 'visible' });

        await pageObjects.datasetQualityDetails.enableFailureStoreToggle.click();
        await expect(pageObjects.datasetQualityDetails.failureStoreModalSaveButton).toBeEnabled();

        await pageObjects.datasetQualityDetails.saveFailureStoreChanges();

        // With a failure store in place the column renders a percentage instead.
        await setFailureStoreLink.waitFor({ state: 'detached' });
      });
    });
  }
);
