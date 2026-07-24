/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
