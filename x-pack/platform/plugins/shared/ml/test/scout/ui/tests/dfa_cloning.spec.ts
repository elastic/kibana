/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 * x-pack/platform/test/functional/apps/ml/data_frame_analytics/group1/cloning.ts
 *
 * Covers the full cloning journey for classification, outlier detection, and
 * regression DFA jobs — verifying that the creation wizard is pre-populated
 * with the original job's configuration and that the cloned job runs to
 * completion.
 *
 * Tagged @local-stateful-classic because the tests mutate global ML indices and
 * depend on the DFA feature which is not yet verified on serverless.
 */

import type { ApiServicesFixture, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, ML_USERS } from '../fixtures';
import { cleanupDfaCloningTest } from '../fixtures/helpers/dfa';

// ── Shared timestamp ensures unique job IDs per test run ─────────────────────

const ts = Date.now();

// ── Classification job config ─────────────────────────────────────────────────

const CLASSIFICATION = {
  archive: 'x-pack/platform/test/fixtures/es_archives/ml/bm_classification',
  sourceViewTitle: 'ft_bank_marketing',
  jobId: `bm_1_${ts}`,
  destIndex: `user-bm_1_${ts}`,
  cloneJobId: `bm_1_${ts}_clone`,
  cloneDestIndex: `user-bm_1_${ts}_clone`,
  jobConfig: {
    id: `bm_1_${ts}`,
    description:
      "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
    source: { index: ['ft_bank_marketing'], query: { match_all: {} } },
    dest: { index: `user-bm_1_${ts}`, results_field: 'ml' },
    analysis: {
      classification: {
        prediction_field_name: 'test',
        dependent_variable: 'y',
        training_percent: 20,
        max_trees: 10,
      },
    },
    analyzed_fields: { includes: [], excludes: [] },
    model_memory_limit: '60mb',
    allow_lazy_start: false,
  },
  expectedJobType: 'classification',
  expectedDependentVariable: 'y',
  expectedTrainingPercent: '20',
  expectedPredictionFieldName: 'test',
  expectedValidationCallouts: 4,
  expectedRow: {
    type: 'classification',
    status: 'stopped',
    progress: '100',
  },
};

// ── Outlier detection job config ──────────────────────────────────────────────

const OUTLIER = {
  archive: 'x-pack/platform/test/fixtures/es_archives/ml/ihp_outlier',
  sourceViewTitle: 'ft_ihp_outlier',
  jobId: `ihp_1_${ts}`,
  destIndex: `user-ihp_1_${ts}`,
  cloneJobId: `ihp_1_${ts}_clone`,
  cloneDestIndex: `user-ihp_1_${ts}_clone`,
  jobConfig: {
    id: `ihp_1_${ts}`,
    description: 'This is the job description',
    source: { index: ['ft_ihp_outlier'], query: { match_all: {} } },
    dest: { index: `user-ihp_1_${ts}`, results_field: 'ml' },
    analysis: { outlier_detection: {} },
    analyzed_fields: { includes: [], excludes: [] },
    model_memory_limit: '5mb',
  },
  expectedJobType: 'outlier_detection',
  expectedValidationCallouts: 1,
  expectedRow: {
    type: 'outlier_detection',
    status: 'stopped',
    progress: '100',
  },
};

// ── Regression job config ─────────────────────────────────────────────────────

const REGRESSION = {
  archive: 'x-pack/platform/test/fixtures/es_archives/ml/egs_regression',
  sourceViewTitle: 'ft_egs_regression',
  jobId: `egs_1_${ts}`,
  destIndex: `user-egs_1_${ts}`,
  cloneJobId: `egs_1_${ts}_clone`,
  cloneDestIndex: `user-egs_1_${ts}_clone`,
  jobConfig: {
    id: `egs_1_${ts}`,
    description: 'This is the job description',
    source: { index: ['ft_egs_regression'], query: { match_all: {} } },
    dest: { index: `user-egs_1_${ts}`, results_field: 'ml' },
    analysis: {
      regression: {
        prediction_field_name: 'test',
        dependent_variable: 'stab',
        training_percent: 20,
        max_trees: 10,
      },
    },
    analyzed_fields: { includes: [], excludes: [] },
    model_memory_limit: '20mb',
  },
  expectedJobType: 'regression',
  expectedDependentVariable: 'stab',
  expectedTrainingPercent: '20',
  expectedPredictionFieldName: 'test',
  expectedValidationCallouts: 3,
  expectedRow: {
    type: 'regression',
    status: 'stopped',
    progress: '100',
  },
};

const assertSourceConfigurationControls = async (page: ScoutPage): Promise<void> => {
  await expect(page.testSubj.locator('mlAnalyticsCreationDataGrid loaded')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.testSubj.locator('mlAnalyticsCreateJobWizardIncludesTable')).toBeVisible();
  await expect(page.testSubj.locator('mlAnalyticsCreateJobWizardIncludesSelect')).toBeVisible();
};

/**
 * Counts root validation callouts only because EUI also stamps `data-test-subj` onto
 * child `__content` nodes
 */
const assertValidationCalloutCount = async (
  page: ScoutPage,
  expectedCount: number
): Promise<void> => {
  const validationCallouts = page.locator('.euiCallOut[data-test-subj~="mlValidationCallout"]');
  await expect(validationCallouts).not.toHaveCount(0);
  await expect(validationCallouts).toHaveCount(expectedCount);
};

const waitForTrainingDocs = async (
  apiServices: ApiServicesFixture,
  jobId: string
): Promise<void> => {
  // The job can briefly report as stopped before training starts.
  await expect
    .poll(async () => (await apiServices.ml.dataFrameAnalytics.getStats(jobId)).hasTrainingDocs, {
      timeout: 60_000,
      intervals: [3_000],
    })
    .toBe(true);
};

// ── Spec ──────────────────────────────────────────────────────────────────────

test.describe('DFA job cloning', { tag: '@local-stateful-classic' }, () => {
  let classificationSourceViewId: string | undefined;
  let outlierSourceViewId: string | undefined;
  let regressionSourceViewId: string | undefined;

  test.beforeAll(async ({ esArchiver, apiServices, esClient }) => {
    await Promise.all([
      apiServices.ml.dataFrameAnalytics.deleteIfExists(CLASSIFICATION.jobId),
      apiServices.ml.dataFrameAnalytics.deleteIfExists(CLASSIFICATION.cloneJobId),
      apiServices.ml.dataFrameAnalytics.deleteIfExists(OUTLIER.jobId),
      apiServices.ml.dataFrameAnalytics.deleteIfExists(OUTLIER.cloneJobId),
      apiServices.ml.dataFrameAnalytics.deleteIfExists(REGRESSION.jobId),
      apiServices.ml.dataFrameAnalytics.deleteIfExists(REGRESSION.cloneJobId),
      esClient.indices.delete({
        index: CLASSIFICATION.cloneDestIndex,
        ignore_unavailable: true,
      }),
      esClient.indices.delete({ index: OUTLIER.cloneDestIndex, ignore_unavailable: true }),
      esClient.indices.delete({ index: REGRESSION.cloneDestIndex, ignore_unavailable: true }),
    ]);

    // Load archives (idempotent)
    await esArchiver.loadIfNeeded(CLASSIFICATION.archive);
    await esArchiver.loadIfNeeded(OUTLIER.archive);
    await esArchiver.loadIfNeeded(REGRESSION.archive);

    // Create source data views
    const [classView, outlierView, regressionView] = await Promise.all([
      apiServices.dataViews.create({
        title: CLASSIFICATION.sourceViewTitle,
        name: CLASSIFICATION.sourceViewTitle,
        override: true,
      }),
      apiServices.dataViews.create({
        title: OUTLIER.sourceViewTitle,
        name: OUTLIER.sourceViewTitle,
        override: true,
      }),
      apiServices.dataViews.create({
        title: REGRESSION.sourceViewTitle,
        name: REGRESSION.sourceViewTitle,
        override: true,
      }),
    ]);
    classificationSourceViewId = classView.data.id;
    outlierSourceViewId = outlierView.data.id;
    regressionSourceViewId = regressionView.data.id;

    // Create the original jobs (NOT started; they just need to exist in the table)
    await Promise.all([
      apiServices.ml.dataFrameAnalytics.createViaKibana(CLASSIFICATION.jobConfig),
      apiServices.ml.dataFrameAnalytics.createViaKibana(OUTLIER.jobConfig),
      apiServices.ml.dataFrameAnalytics.createViaKibana(REGRESSION.jobConfig),
    ]);
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await Promise.all([
      cleanupDfaCloningTest({
        apiServices,
        esClient,
        originalJobId: CLASSIFICATION.jobId,
        cloneJobId: CLASSIFICATION.cloneJobId,
        sourceDataViewId: classificationSourceViewId,
        originalDestIndex: CLASSIFICATION.destIndex,
        cloneDestIndex: CLASSIFICATION.cloneDestIndex,
      }),
      cleanupDfaCloningTest({
        apiServices,
        esClient,
        originalJobId: OUTLIER.jobId,
        cloneJobId: OUTLIER.cloneJobId,
        sourceDataViewId: outlierSourceViewId,
        originalDestIndex: OUTLIER.destIndex,
        cloneDestIndex: OUTLIER.cloneDestIndex,
      }),
      cleanupDfaCloningTest({
        apiServices,
        esClient,
        originalJobId: REGRESSION.jobId,
        cloneJobId: REGRESSION.cloneJobId,
        sourceDataViewId: regressionSourceViewId,
        originalDestIndex: REGRESSION.destIndex,
        cloneDestIndex: REGRESSION.cloneDestIndex,
      }),
    ]);
  });

  // ── Classification cloning ──────────────────────────────────────────────

  test('clones a classification job through the wizard', async ({
    page,
    browserAuth,
    pageObjects: { dataFrameAnalytics },
    apiServices,
  }) => {
    // The bounded clone may run for up to 2 minutes; allow another minute for the UI journey.
    test.setTimeout(3 * 60 * 1000);

    await browserAuth.loginWithCustomRole(ML_USERS.mlPoweruser);

    await test.step('opens the wizard in clone mode', async () => {
      await dataFrameAnalytics.gotoJobList();
      await dataFrameAnalytics.filterByJobId(CLASSIFICATION.jobId);
      await dataFrameAnalytics.cloneJob(CLASSIFICATION.jobId);

      await expect(page.testSubj.locator('mlDataFrameAnalyticsWizardHeaderTitle')).toContainText(
        'Clone job'
      );
      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardConfigurationStep active')
      ).toBeVisible();
    });

    await test.step('verifies config step is pre-populated', async () => {
      // Job type is pre-selected
      await expect(
        page.testSubj.locator(
          `mlAnalyticsCreation-${CLASSIFICATION.expectedJobType}-option selectedJobType`
        )
      ).toBeVisible();
      await assertSourceConfigurationControls(page);

      // Dependent variable and training percent are pre-populated for classification
      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardDependentVariableSelect loaded')
      ).toBeVisible({ timeout: 30_000 });
      // comboBoxSearchInput is the actual <input> inside OptionListWithFieldStats;
      // comboBoxInput is the EuiFormControlLayout wrapper div and does not support toHaveValue.
      await expect(
        page.testSubj
          .locator('~mlAnalyticsCreateJobWizardDependentVariableSelect')
          .locator('[data-test-subj="comboBoxSearchInput"]')
      ).toHaveValue(CLASSIFICATION.expectedDependentVariable);

      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardTrainingPercentSlider')
      ).toHaveAttribute('value', CLASSIFICATION.expectedTrainingPercent);

      await dataFrameAnalytics.continueToAdditionalOptions();
    });

    await test.step('verifies additional options step is pre-populated', async () => {
      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardPredictionFieldNameInput')
      ).toHaveValue(CLASSIFICATION.expectedPredictionFieldName);
      await dataFrameAnalytics.openHyperParameters();
      await expect(page.testSubj.locator('mlAnalyticsCreateJobFlyoutMaxTreesInput')).toHaveValue(
        '10'
      );

      await dataFrameAnalytics.continueToDetails();
    });

    await test.step('verifies details step and sets clone job values', async () => {
      await expect(page.testSubj.locator('mlAnalyticsCreateJobFlyoutJobIdInput')).toHaveValue('');

      await expect(page.testSubj.locator('mlDFAnalyticsJobCreationJobDescription')).toHaveValue(
        CLASSIFICATION.jobConfig.description
      );

      await expect(
        page.testSubj.locator('mlCreationWizardUtilsJobIdAsDestIndexNameSwitch')
      ).toHaveAttribute('aria-checked', 'true');

      await dataFrameAnalytics.setJobId(CLASSIFICATION.cloneJobId);
      await dataFrameAnalytics.setDestIndexSameAsJobId(false);
      await dataFrameAnalytics.setDestinationIndex(CLASSIFICATION.cloneDestIndex);

      await dataFrameAnalytics.continueToValidation();
    });

    await test.step('validates and creates the clone job', async () => {
      await assertValidationCalloutCount(page, CLASSIFICATION.expectedValidationCallouts);

      await dataFrameAnalytics.continueToCreate();
      await expect(page.testSubj.locator('mlAnalyticsCreateJobWizardCreateButton')).toBeEnabled();
    });

    await test.step('runs the clone job and verifies it in the job list', async () => {
      await dataFrameAnalytics.createAndStartJob();

      await waitForTrainingDocs(apiServices, CLASSIFICATION.cloneJobId);
      await apiServices.ml.dataFrameAnalytics.waitForStopped(CLASSIFICATION.cloneJobId);

      await dataFrameAnalytics.gotoJobList();
      await dataFrameAnalytics.filterByJobId(CLASSIFICATION.cloneJobId);

      await expect
        .poll(async () => (await dataFrameAnalytics.getRowData(CLASSIFICATION.cloneJobId)).status, {
          timeout: 60_000,
          intervals: [3_000],
        })
        .toBe(CLASSIFICATION.expectedRow.status);

      const rowData = await dataFrameAnalytics.getRowData(CLASSIFICATION.cloneJobId);
      expect(rowData).toMatchObject({
        id: CLASSIFICATION.cloneJobId,
        type: CLASSIFICATION.expectedRow.type,
        status: CLASSIFICATION.expectedRow.status,
        progress: CLASSIFICATION.expectedRow.progress,
      });
    });
  });

  // ── Outlier detection cloning ───────────────────────────────────────────

  test('clones an outlier detection job through the wizard', async ({
    page,
    browserAuth,
    pageObjects: { dataFrameAnalytics },
    apiServices,
  }) => {
    // The clone may run for up to 2 minutes; allow another minute for the UI journey.
    test.setTimeout(3 * 60 * 1000);

    await browserAuth.loginWithCustomRole(ML_USERS.mlPoweruser);

    await test.step('opens the wizard in clone mode', async () => {
      await dataFrameAnalytics.gotoJobList();
      await dataFrameAnalytics.filterByJobId(OUTLIER.jobId);
      await dataFrameAnalytics.cloneJob(OUTLIER.jobId);

      await expect(page.testSubj.locator('mlDataFrameAnalyticsWizardHeaderTitle')).toContainText(
        'Clone job'
      );
      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardConfigurationStep active')
      ).toBeVisible();
    });

    await test.step('verifies config step — outlier detection has no dependent variable', async () => {
      await expect(
        page.testSubj.locator(
          `mlAnalyticsCreation-${OUTLIER.expectedJobType}-option selectedJobType`
        )
      ).toBeVisible();
      await assertSourceConfigurationControls(page);
      // Outlier detection has no dependent variable or training percent fields
      await expect(
        page.testSubj.locator('~mlAnalyticsCreateJobWizardDependentVariableSelect')
      ).toBeHidden();

      await dataFrameAnalytics.continueToAdditionalOptions();
    });

    await test.step('continues to details step and sets clone job values', async () => {
      // Additional options step: no prediction_field_name for outlier detection
      await dataFrameAnalytics.continueToDetails();

      await expect(page.testSubj.locator('mlAnalyticsCreateJobFlyoutJobIdInput')).toHaveValue('');

      await expect(page.testSubj.locator('mlDFAnalyticsJobCreationJobDescription')).toHaveValue(
        OUTLIER.jobConfig.description
      );

      await expect(
        page.testSubj.locator('mlCreationWizardUtilsJobIdAsDestIndexNameSwitch')
      ).toHaveAttribute('aria-checked', 'true');

      await dataFrameAnalytics.setJobId(OUTLIER.cloneJobId);
      await dataFrameAnalytics.setDestIndexSameAsJobId(false);
      await dataFrameAnalytics.setDestinationIndex(OUTLIER.cloneDestIndex);

      await dataFrameAnalytics.continueToValidation();
    });

    await test.step('validates and creates the clone job', async () => {
      await assertValidationCalloutCount(page, OUTLIER.expectedValidationCallouts);

      await dataFrameAnalytics.continueToCreate();
      await expect(page.testSubj.locator('mlAnalyticsCreateJobWizardCreateButton')).toBeEnabled();
    });

    await test.step('runs the clone job and verifies it in the job list', async () => {
      await dataFrameAnalytics.createAndStartJob();

      await waitForTrainingDocs(apiServices, OUTLIER.cloneJobId);
      await apiServices.ml.dataFrameAnalytics.waitForStopped(OUTLIER.cloneJobId);

      await dataFrameAnalytics.gotoJobList();
      await dataFrameAnalytics.filterByJobId(OUTLIER.cloneJobId);

      await expect
        .poll(async () => (await dataFrameAnalytics.getRowData(OUTLIER.cloneJobId)).status, {
          timeout: 60_000,
          intervals: [3_000],
        })
        .toBe(OUTLIER.expectedRow.status);

      const rowData = await dataFrameAnalytics.getRowData(OUTLIER.cloneJobId);
      expect(rowData).toMatchObject({
        id: OUTLIER.cloneJobId,
        type: OUTLIER.expectedRow.type,
        status: OUTLIER.expectedRow.status,
        progress: OUTLIER.expectedRow.progress,
      });
    });
  });

  // ── Regression cloning ──────────────────────────────────────────────────

  test('clones a regression job through the wizard', async ({
    page,
    browserAuth,
    pageObjects: { dataFrameAnalytics },
    apiServices,
  }) => {
    // The bounded clone may run for up to 2 minutes; allow another minute for the UI journey.
    test.setTimeout(3 * 60 * 1000);

    await browserAuth.loginWithCustomRole(ML_USERS.mlPoweruser);

    await test.step('opens the wizard in clone mode', async () => {
      await dataFrameAnalytics.gotoJobList();
      await dataFrameAnalytics.filterByJobId(REGRESSION.jobId);
      await dataFrameAnalytics.cloneJob(REGRESSION.jobId);

      await expect(page.testSubj.locator('mlDataFrameAnalyticsWizardHeaderTitle')).toContainText(
        'Clone job'
      );
      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardConfigurationStep active')
      ).toBeVisible();
    });

    await test.step('verifies config step is pre-populated', async () => {
      await expect(
        page.testSubj.locator(
          `mlAnalyticsCreation-${REGRESSION.expectedJobType}-option selectedJobType`
        )
      ).toBeVisible();
      await assertSourceConfigurationControls(page);

      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardDependentVariableSelect loaded')
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.testSubj
          .locator('~mlAnalyticsCreateJobWizardDependentVariableSelect')
          .locator('[data-test-subj="comboBoxSearchInput"]')
      ).toHaveValue(REGRESSION.expectedDependentVariable);

      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardTrainingPercentSlider')
      ).toHaveAttribute('value', REGRESSION.expectedTrainingPercent);

      await dataFrameAnalytics.continueToAdditionalOptions();
    });

    await test.step('verifies additional options step is pre-populated', async () => {
      await expect(
        page.testSubj.locator('mlAnalyticsCreateJobWizardPredictionFieldNameInput')
      ).toHaveValue(REGRESSION.expectedPredictionFieldName);
      await dataFrameAnalytics.openHyperParameters();
      await expect(page.testSubj.locator('mlAnalyticsCreateJobFlyoutMaxTreesInput')).toHaveValue(
        '10'
      );

      await dataFrameAnalytics.continueToDetails();
    });

    await test.step('verifies details step and sets clone job values', async () => {
      await expect(page.testSubj.locator('mlAnalyticsCreateJobFlyoutJobIdInput')).toHaveValue('');

      await expect(page.testSubj.locator('mlDFAnalyticsJobCreationJobDescription')).toHaveValue(
        REGRESSION.jobConfig.description
      );

      await expect(
        page.testSubj.locator('mlCreationWizardUtilsJobIdAsDestIndexNameSwitch')
      ).toHaveAttribute('aria-checked', 'true');

      await dataFrameAnalytics.setJobId(REGRESSION.cloneJobId);
      await dataFrameAnalytics.setDestIndexSameAsJobId(false);
      await dataFrameAnalytics.setDestinationIndex(REGRESSION.cloneDestIndex);

      await dataFrameAnalytics.continueToValidation();
    });

    await test.step('validates and creates the clone job', async () => {
      await assertValidationCalloutCount(page, REGRESSION.expectedValidationCallouts);

      await dataFrameAnalytics.continueToCreate();
      await expect(page.testSubj.locator('mlAnalyticsCreateJobWizardCreateButton')).toBeEnabled();
    });

    await test.step('runs the clone job and verifies it in the job list', async () => {
      await dataFrameAnalytics.createAndStartJob();

      await waitForTrainingDocs(apiServices, REGRESSION.cloneJobId);
      await apiServices.ml.dataFrameAnalytics.waitForStopped(REGRESSION.cloneJobId);

      await dataFrameAnalytics.gotoJobList();
      await dataFrameAnalytics.filterByJobId(REGRESSION.cloneJobId);

      await expect
        .poll(async () => (await dataFrameAnalytics.getRowData(REGRESSION.cloneJobId)).status, {
          timeout: 60_000,
          intervals: [3_000],
        })
        .toBe(REGRESSION.expectedRow.status);

      const rowData = await dataFrameAnalytics.getRowData(REGRESSION.cloneJobId);
      expect(rowData).toMatchObject({
        id: REGRESSION.cloneJobId,
        type: REGRESSION.expectedRow.type,
        status: REGRESSION.expectedRow.status,
        progress: REGRESSION.expectedRow.progress,
      });
    });
  });
});
