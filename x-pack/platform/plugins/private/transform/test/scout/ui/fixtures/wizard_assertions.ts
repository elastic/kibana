/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { A11Y_EXCLUSIONS, A11Y_SELECTORS } from './constants';
import type { AggregationForm, TransformWizardPage } from './page_objects/transform_wizard_page';

export interface AggregationEntry {
  identifier: string;
  label: string;
  form?: AggregationForm;
  /** Aggregations that aren't valid with their defaults open their form popover when added. */
  formOpensOnAdd?: boolean;
  subAggs?: AggregationEntry[];
}

export interface GroupByEntry {
  identifier: string;
  label: string;
  intervalLabel?: string;
}

const INDEX_PREVIEW_ROWS = 5;
const WIZARD_RUN_TIMEOUT_MS = 60_000;
export const POLL_TIMEOUT_MS = 30_000;
// The ecommerce sample spans Jun 12 – Jul 12, 2023.
const ECOMMERCE_TIME_RANGE = {
  from: 'Jun 1, 2023 @ 00:00:00.000',
  to: 'Aug 1, 2023 @ 00:00:00.000',
};

/**
 * Asserts the Discover hit count of a destination index opened from the transform list.
 * A destination with a time field has no results in the last 15 minutes, so the time range is
 * widened to the sample's.
 */
export const assertDiscoverHits = async (
  page: ScoutPage,
  pageObjects: Pick<PageObjects, 'discover' | 'datePicker'>,
  destination: { index: string; hasTimeField: boolean; hits: string }
) => {
  await pageObjects.discover.waitUntilSearchingHasFinished();
  if (destination.hasTimeField) {
    await pageObjects.datePicker.setCommonlyUsedTime('Last_15 minutes');
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await expect(page.getByTestId('discoverNoResults')).toBeVisible();
    await expect(page.getByTestId('discover-dataView-switch-link')).toContainText(
      destination.index
    );
    await pageObjects.datePicker.setAbsoluteRange(ECOMMERCE_TIME_RANGE);
    await pageObjects.discover.waitUntilSearchingHasFinished();
  }
  await expect(page.getByTestId('discoverQueryHits')).toHaveText(destination.hits);
};

export const assertNoA11yViolations = async (page: ScoutPage) => {
  const { violations } = await page.checkA11y({
    include: A11Y_SELECTORS,
    exclude: A11Y_EXCLUSIONS,
  });
  expect(violations).toStrictEqual([]);
};

/**
 * Source preview of the define step: empty for the last 15 minutes, then "Use full data" picks
 * the source's whole time range and loads it. Data tiers only exist on stateful deployments.
 */
export const assertSourcePreview = async (
  transformWizard: TransformWizardPage,
  datePicker: PageObjects['datePicker'],
  expected: { isServerless: boolean; fullTimeRange: { start: string; end: string } }
) => {
  await datePicker.setCommonlyUsedTime('Last_15 minutes');
  await expect(transformWizard.indexPreviewEmpty).toBeVisible();
  await expect(transformWizard.dataTierOptionsButton).toBeVisible({
    visible: !expected.isServerless,
  });

  await transformWizard.useFullData();
  await expect(async () => {
    expect(await datePicker.getTimeConfig()).toStrictEqual(expected.fullTimeRange);
  }).toPass({ timeout: POLL_TIMEOUT_MS });
  await expect(async () => {
    expect(await transformWizard.getDataGridRowCount(transformWizard.indexPreview)).toBe(
      INDEX_PREVIEW_ROWS
    );
  }).toPass({ timeout: POLL_TIMEOUT_MS });

  await expect(transformWizard.transformPreviewEmpty).toBeVisible();
  await expect(transformWizard.queryInput).toHaveText('');
  await expect(transformWizard.advancedQueryEditorSwitch).not.toBeChecked();
  await expect(transformWizard.indexPreviewHistogramButton).toHaveAttribute('aria-pressed', 'true');
};

export interface HistogramChart {
  id: string;
  legend?: string;
}

/** Charts are canvas, so only their presence and labels are asserted, not their colors. */
export const assertHistogramCharts = async (
  transformWizard: TransformWizardPage,
  charts: HistogramChart[]
) => {
  for (const chart of charts) {
    await expect(transformWizard.getHistogramChart(chart.id, 'histogram')).toBeVisible();
    await expect(transformWizard.getHistogramChart(chart.id, 'id')).toHaveText(chart.id);
    if (chart.legend !== undefined) {
      await expect(transformWizard.getHistogramChart(chart.id, 'legend')).toHaveText(chart.legend);
    }
  }
};

export const assertAddsGroupByEntries = async (
  transformWizard: TransformWizardPage,
  entries: GroupByEntry[]
) => {
  for (const [index, entry] of entries.entries()) {
    await transformWizard.addGroupByEntry(entry.identifier);
    await expect(transformWizard.getGroupByEntryLabel(index)).toHaveText(entry.label);
    if (entry.intervalLabel !== undefined) {
      await expect(transformWizard.getGroupByEntryIntervalLabel(index)).toHaveText(
        entry.intervalLabel
      );
    }
  }
};

export const assertAddsAggregations = async (
  transformWizard: TransformWizardPage,
  entries: AggregationEntry[],
  parentPath: number[] = []
) => {
  for (const [index, entry] of entries.entries()) {
    const path = [...parentPath, index];
    await transformWizard.addAggregationEntry(entry.identifier, parentPath);
    await expect(
      transformWizard.getAggregationEntry(path).getByTestId('transformAggregationEntryLabel')
    ).toContainText([entry.label]);

    if (entry.form !== undefined) {
      await transformWizard.fillAggregationForm(
        entry.label,
        entry.form,
        entry.formOpensOnAdd ?? false
      );
    }
    if (entry.subAggs !== undefined) {
      await assertAddsAggregations(transformWizard, entry.subAggs, path);
    }
  }
};

export const assertFieldStatsFlyout = async (
  transformWizard: TransformWizardPage,
  trigger: Parameters<TransformWizardPage['openFieldStatsFlyout']>[0],
  fieldName: string,
  part: 'histogram' | 'topValues'
) => {
  await transformWizard.openFieldStatsFlyout(trigger, fieldName);
  await expect(transformWizard.getFieldStatsContent(fieldName, part)).toBeVisible();
  await transformWizard.closeFieldStatsFlyout(trigger, fieldName);
};

export const assertDetailsStep = async (
  transformWizard: TransformWizardPage,
  details: { transformId: string; description: string; destinationIndex: string }
) => {
  await transformWizard.advanceToDetailsStep();

  await expect(transformWizard.transformIdInput).toHaveValue('');
  await transformWizard.transformIdInput.fill(details.transformId);
  await expect(transformWizard.descriptionInput).toHaveValue('');
  await transformWizard.descriptionInput.fill(details.description);

  await expect(transformWizard.destIndexSameAsIdSwitch).toBeChecked();
  await transformWizard.destIndexSameAsIdSwitch.click();
  await expect(transformWizard.destinationIndexInput).toHaveValue(details.transformId);
  await transformWizard.destinationIndexInput.fill(details.destinationIndex);

  await expect(transformWizard.createDataViewSwitch).toBeChecked();
};

/** Sets a valid number of failure retries; range validation is unit-tested. */
export const assertNumFailureRetries = async (
  transformWizard: TransformWizardPage,
  value: string
) => {
  await transformWizard.openAdvancedSettings();
  await expect(transformWizard.numFailureRetriesInput).toHaveValue('');
  await transformWizard.numFailureRetriesInput.fill(value);
  // A valid input leaves aria-invalid empty rather than "false".
  await expect(transformWizard.numFailureRetriesInput).not.toHaveAttribute('aria-invalid', 'true');
};

export const assertCreateStep = async (
  transformWizard: TransformWizardPage,
  expectedNumFailureRetries?: string
) => {
  await transformWizard.advanceToCreateStep();
  if (expectedNumFailureRetries !== undefined) {
    await transformWizard.openAdvancedSettingsSummary();
    await expect(transformWizard.numFailureRetriesSummary).toContainText(expectedNumFailureRetries);
  }
  await expect(transformWizard.createAndStartButton).toBeEnabled();
  await expect(transformWizard.createButton).toBeEnabled();
  await expect(transformWizard.copyToClipboardButton).toBeEnabled();
};

/** Creates and starts the transform from the wizard and waits for a batch run to finish. */
export const assertRunsBatchTransform = async (transformWizard: TransformWizardPage) => {
  await transformWizard.createTransform();
  await expect(transformWizard.createButton).toBeDisabled();
  await transformWizard.startTransform();
  await expect(transformWizard.startButton).toBeDisabled();
  await expect(transformWizard.errorToast).toBeHidden();
  await expect(transformWizard.progressBar).toHaveAttribute('value', '100', {
    timeout: WIZARD_RUN_TIMEOUT_MS,
  });
};
