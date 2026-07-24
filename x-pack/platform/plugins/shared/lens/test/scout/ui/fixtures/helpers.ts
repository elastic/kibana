/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaCodeEditorWrapper } from '@kbn/scout';
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
  await switcher.locator(`[data-test-subj="dataView-${title}"]`).click();
  // justified: field list reload after DV switch can be slow under parallel CI load
  await page.testSubj.locator('fieldListLoading').waitFor({ state: 'hidden', timeout: 30_000 });
}

/**
 * Adds a new data layer to the current XY chart.
 * Equivalent to FTR `lens.createLayer('data')` for XY visualizations that show the layer-type picker.
 */
export async function addDataLayer(
  page: ScoutPage,
  seriesType: 'bar' | 'line' = 'line'
): Promise<void> {
  await page.testSubj.click('lnsLayerAddButton');
  await page.testSubj.click('lnsLayerAddButton-data');
  await page.testSubj.click(`lnsXY_seriesType-${seriesType}`);
  await page.testSubj.locator('lns-layerPanel-1').waitFor({ state: 'visible' });
}

/**
 * Creates a runtime field from the field editor flyout (Lens or Discover).
 * Caller must already open the field editor (e.g. via indexPattern-add-field).
 */
export async function createRuntimeFieldFromEditor(
  page: ScoutPage,
  fieldName: string,
  script: string
): Promise<void> {
  // Use an attribute selector (not `page.testSubj`) so this works for both a ScoutPage
  // and a plain Playwright Page (e.g. the Discover tab opened via `context.newPage()`).
  const fieldEditor = page.locator('[data-test-subj="fieldEditor"]');
  await fieldEditor.waitFor({ state: 'visible' });

  await fieldEditor.getByRole('textbox', { name: /Name/ }).fill(fieldName);
  const valueToggle = fieldEditor.getByRole('switch', { name: 'Set value' });
  await expect(valueToggle).toHaveAttribute('aria-checked', 'false');
  await valueToggle.click();

  await fieldEditor.getByRole('textbox', { name: /Editor content/ }).waitFor({ state: 'visible' });
  const codeEditor = new KibanaCodeEditorWrapper(page);
  await codeEditor.setCodeEditorValue(script);

  await fieldEditor.getByRole('button', { name: 'Save' }).click();
  await fieldEditor.waitFor({ state: 'hidden' });
}

/**
 * Opens Lens export and completes the CSV download path.
 *
 * Lens Share has two product outcomes after one Export click:
 * - auto-download when CSV is the only integration (`ELASTIC_LENS_CSV_CONTENT` with debug flag)
 * - a popover item when reporting is also registered (`exportMenuItem-CSV`)
 *
 * Waits for Export to be enabled (app signal that visualization data is present), clicks once,
 * then waits for either readiness signal and clicks the menu item at most once.
 * Dual-path handling lives here (not in the spec) for `playwright/no-conditional-in-test`.
 */
export async function completeLensCsvExport(page: ScoutPage): Promise<void> {
  const exportButton = page.testSubj.locator('lnsApp_exportButton');
  const csvMenuItem = page.testSubj.locator('exportMenuItem-CSV');

  // Readiness before click: csvEnabled / shareUrlEnabled both require hasData.
  await expect(exportButton).toBeEnabled();
  await exportButton.click();

  let shouldClickMenu = false;
  // justified: share integrations resolve asynchronously after Export opens
  await expect
    .poll(
      async () => {
        const hasContent = await page.evaluate(() => {
          const content = (
            window as Window & {
              ELASTIC_LENS_CSV_CONTENT?: Record<string, { content: string; type: string }>;
            }
          ).ELASTIC_LENS_CSV_CONTENT;
          return Boolean(content && Object.keys(content).length > 0);
        });
        if (hasContent) {
          return true;
        }
        if (await csvMenuItem.isVisible()) {
          shouldClickMenu = true;
          return true;
        }
        return false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);

  if (shouldClickMenu) {
    await csvMenuItem.click();
  }
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
