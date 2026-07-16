/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { PageObjects, Locator, ScoutPage } from '@kbn/scout';

/**
 * Creates an ad hoc (temporary) data view from the Lens data panel switcher.
 * Equivalent to FTR `dataViews.createFromSearchBar({ name, adHoc: true })` in the Lens context.
 */
export async function createAdHocDataViewFromLens(page: ScoutPage, name: string): Promise<void> {
  await page.testSubj.click('lns-dataView-switch-link');
  await page.testSubj.click('dataview-create-new');

  const flyout = page.testSubj.locator('indexPatternEditorFlyout');
  await flyout.waitFor({ state: 'visible' });

  const titleInput = page.testSubj.locator('createIndexPatternTitleInput');
  await titleInput.fill(name);
  await expect(titleInput).not.toHaveAttribute('aria-invalid', 'true');

  await page.testSubj.click('exploreIndexPatternButton');
  await flyout.waitFor({ state: 'hidden' });
  // Wait until the switcher reflects the new DV name
  await expect(page.testSubj.locator('lns-dataView-switch-link')).toContainText(name);
}

/**
 * Switches the active data view in the Lens data panel (left-side field list).
 * Equivalent to FTR `lens.switchDataPanelIndexPattern(title)`.
 */
export async function switchDataPanelIndexPattern(page: ScoutPage, title: string): Promise<void> {
  await page.testSubj.click('lns-dataView-switch-link');
  const switcher = page.testSubj.locator('indexPattern-switcher');
  await switcher.waitFor({ state: 'visible' });
  await page.testSubj.fill('indexPattern-switcher--input', title);
  await page
    .locator(`[data-test-subj="indexPattern-switcher"] [data-test-subj="dataView-${title}"]`)
    .click();
  await page.testSubj.locator('fieldListLoading').waitFor({ state: 'hidden', timeout: 30_000 });
}

/**
 * Adds a new data (bar) layer to the current XY chart.
 * Equivalent to FTR `lens.createLayer('data')` for XY visualizations that show the layer-type picker.
 */
export async function addDataLayer(page: ScoutPage): Promise<void> {
  await page.testSubj.click('lnsLayerAddButton');
  await page.testSubj.click('lnsLayerAddButton-data');
  await page.testSubj.click('lnsXY_seriesType-bar');
  await page.testSubj.locator('lns-layerPanel-1').waitFor({ state: 'visible' });
}

type DashboardAndLens = Pick<PageObjects, 'dashboard' | 'lens'>;

export async function openDimensionEditorAndWaitForFlyout(
  { lens }: DashboardAndLens,
  page: ScoutPage,
  dimensionPanel: Locator
) {
  const dimensionButton = dimensionPanel.getByRole('button', { name: /Edit .* configuration/ });
  await dimensionButton.click();

  // Confirm that the secondary flyout is opened
  await expect(lens.getSecondaryFlyoutBackButton()).toBeVisible();
  await expect(page.getByTestId('text-based-languages-field-selection-row')).toBeVisible();
}

export async function openInlineEditorAndWaitVisible(
  { dashboard, lens }: DashboardAndLens,
  panelId: string
) {
  await dashboard.openInlineEditor(panelId);
  await expect(lens.getInlineEditor()).toBeVisible();
}

export async function applyLensInlineEditorAndWaitClosed({ lens }: Pick<PageObjects, 'lens'>) {
  await lens.getApplyFlyoutButton().click();
  await expect(lens.getInlineEditor()).toBeHidden();
}

export async function cancelLensInlineEditorAndWaitClosed({ lens }: Pick<PageObjects, 'lens'>) {
  await lens.getCancelFlyoutButton().click();
  await expect(lens.getInlineEditor()).toBeHidden();
}

export async function convertToEsqlViaModal({
  pageObjects,
  page,
}: {
  pageObjects: DashboardAndLens;
  page: ScoutPage;
}) {
  const { lens } = pageObjects;

  // Click on the "Conver to ES|QL" button in the in-line editor
  await lens.getConvertToEsqlButton().click();

  // Click on the confirmation button in the modal
  const modal = lens.getConvertToEsqModal();
  await lens.getConvertToEsqModalConfirmButton().click();
  await expect(modal).toBeHidden();

  // Confirm that the in-line editor has been updated
  await expect(lens.getConvertToEsqlButton()).toBeHidden();
  await expect(page.getByTestId('ESQLEditor')).toBeVisible();
  await expect(page.getByText('ES|QL Query Results')).toBeVisible();
}
