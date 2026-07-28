/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ContentListWrapper } from '@kbn/scout';
import type {
  ApiServicesFixture,
  Locator,
  PageObjects,
  ScoutPage,
  ScoutSpaceParallelFixture,
} from '@kbn/scout';
import { DATA_VIEW_ID, LOGSTASH_IN_RANGE_DATES } from './constants';

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
type VisualizeAndLens = Pick<PageObjects, 'visualize' | 'lens'>;

const LOGSTASH_UI_SETTINGS_KEYS = ['defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults'];

/** Sets the logstash default index, UTC timezone and an in-range time default for the space. */
export async function setLogstashUiSettings({
  scoutSpace,
}: {
  scoutSpace: ScoutSpaceParallelFixture;
}): Promise<void> {
  await scoutSpace.uiSettings.set({
    defaultIndex: DATA_VIEW_ID.LOGSTASH,
    'dateFormat:tz': 'UTC',
    'timepicker:timeDefaults': JSON.stringify(LOGSTASH_IN_RANGE_DATES),
  });
}

/** Unsets the UI settings applied by `setLogstashUiSettings`. */
export async function unsetLogstashUiSettings({
  scoutSpace,
}: {
  scoutSpace: ScoutSpaceParallelFixture;
}): Promise<void> {
  await scoutSpace.uiSettings.unset(...LOGSTASH_UI_SETTINGS_KEYS);
}

/**
 * Sets the shared logstash UI settings and creates a `logstash-*` data view scoped to
 * the space (for suites that build a Lens chart from scratch rather than opening one
 * from an archive). Returns the created data view id for teardown via
 * `cleanupLogstashDataView`.
 */
export async function setupLogstashDataView(
  {
    scoutSpace,
    apiServices,
  }: { scoutSpace: ScoutSpaceParallelFixture; apiServices: ApiServicesFixture },
  namePrefix: string
): Promise<string> {
  await setLogstashUiSettings({ scoutSpace });
  const { data: dataView } = await apiServices.dataViews.create({
    title: DATA_VIEW_ID.LOGSTASH,
    name: `${namePrefix}-${Date.now()}`,
    timeFieldName: '@timestamp',
    spaceId: scoutSpace.id,
  });
  return dataView.id;
}

/** Deletes the data view (if any) and unsets the UI settings from `setupLogstashDataView`. */
export async function cleanupLogstashDataView(
  {
    scoutSpace,
    apiServices,
  }: { scoutSpace: ScoutSpaceParallelFixture; apiServices: ApiServicesFixture },
  dataViewId: string | undefined
): Promise<void> {
  if (dataViewId) {
    await apiServices.dataViews.delete(dataViewId, scoutSpace.id);
  }
  await unsetLogstashUiSettings({ scoutSpace });
}

/**
 * Builds a fresh Lens Metric visualization directly from the editor UI, with a primary and a
 * secondary "Average of bytes" dimension. Used instead of the FTR-only `lens` service's
 * `createMetricChart` API helper, so metric specs stay self-contained.
 */
export async function buildMetricVisualization({ visualize, lens }: VisualizeAndLens) {
  await visualize.goto();
  await visualize.openNewVisualizationWizard();
  await visualize.clickVisType('lens');
  await lens.switchToVisualization('lnsMetric', { search: 'Metric' });

  await lens.configureDimension({
    dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
    operation: 'average',
    field: 'bytes',
  });
  await lens.configureDimension({
    dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
    operation: 'average',
    field: 'bytes',
  });
}

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

/**
 * Deletes an annotation group saved object from the Visualize "Annotation library" tab, by
 * title. Navigates directly to the tab via URL hash rather than clicking through the
 * Visualize landing page's tab bar, which has no stable per-tab test subject.
 */
export async function deleteAnnotationGroupFromLibrary(page: ScoutPage, title: string) {
  await page.gotoApp('visualize', { hash: '/annotations' });
  const contentList = new ContentListWrapper(page);
  await contentList.searchBox.waitFor({ state: 'visible' });
  await contentList.searchFor(title);
  await contentList.selectAllAndDelete();
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
