/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Locator, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { Request } from '@playwright/test';

const FAILED_DOCS_ISSUE = 'Documents indexing failed';
const DATE_RANGE_PRESETS_URL = '/internal/user_storage/data%3AdateRangePicker%3Apresets';

/**
 * Runs navigation and waits for the date picker and its optional persisted presets request.
 */
export async function navigateAndWaitForDateRangePresets(
  page: ScoutPage,
  navigate: () => Promise<void>
): Promise<void> {
  const presetResponses: Array<Promise<unknown>> = [];
  const onRequest = (request: Request) => {
    if (request.url().includes(DATE_RANGE_PRESETS_URL)) {
      presetResponses.push(request.response());
    }
  };

  page.on('request', onRequest);
  try {
    await navigate();
    await page
      .getByTestId('dateRangePickerControlButton')
      .or(page.getByTestId('superDatePickerToggleQuickMenuButton'))
      .waitFor({ state: 'visible' });
  } finally {
    page.off('request', onRequest);
  }
  await Promise.all(presetResponses);
}

/**
 * Saves failure store changes in the shared failure store modal
 * (`@kbn/failure-store-modal`, used from the data quality page).
 */
export async function saveFailureStoreChanges(page: ScoutPage): Promise<void> {
  const saveButton = page.getByTestId('failureStoreModalSaveButton');
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
}

export function getQualityIssueRow(table: Locator, issue: string): Locator {
  return table.getByTestId('datasetQualityDetailsDegradedTableRow').filter({ hasText: issue });
}

/**
 * Waits for the quality issues table to show the degraded field and the failed docs rows.
 * Both are fetched independently and each response re-sorts the table, so interacting with a
 * row before the two have landed can hit a row that has just been re-pointed at the other issue.
 */
export async function waitForQualityIssuesTable(
  page: ScoutPage,
  degradedField: string
): Promise<Locator> {
  const table = page.getByTestId('datasetQualityDetailsDegradedFieldTable');
  await expect(table).toBeVisible();
  await expect(getQualityIssueRow(table, degradedField)).toBeVisible();
  await expect(getQualityIssueRow(table, FAILED_DOCS_ISSUE)).toBeVisible();
  return table;
}

/**
 * Expands the quality issue of a degraded field and returns its flyout.
 */
export async function openDegradedFieldFlyout(
  page: ScoutPage,
  degradedField: string
): Promise<Locator> {
  const table = await waitForQualityIssuesTable(page, degradedField);
  await getQualityIssueRow(table, degradedField)
    .getByTestId('datasetQualityDetailsQualityIssuesExpandButton')
    .click();

  const flyout = page.getByTestId('datasetQualityDetailsDegradedFieldFlyout');
  await expect(flyout).toBeVisible();
  return flyout;
}

/**
 * Waits for the failed documents KPI card to hold a resolved value. The card renders a `--`
 * placeholder while the data stream details load and is swapped for the "No failure store" card
 * when the stream has no failure store, so it is only actionable once the details have loaded.
 */
export async function waitForFailedDocsCard(page: ScoutPage): Promise<Locator> {
  const card = page.getByTestId('datasetQualityDetailsSummaryKpiCard-Failed documents');
  await expect(card).toBeVisible();
  await expect(
    card.getByTestId('datasetQualityDetailsSummaryKpiValue-Failed documents')
  ).not.toHaveText('--');
  return card;
}
