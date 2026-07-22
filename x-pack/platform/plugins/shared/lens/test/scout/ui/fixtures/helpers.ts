/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { PageObjects, Locator, ScoutPage } from '@kbn/scout';
import { DATA_VIEW_ID, LOGSTASH_IN_RANGE_DATES } from './constants';

type DashboardAndLens = Pick<PageObjects, 'dashboard' | 'lens'>;

interface LogstashSpaceSetupContext {
  scoutSpace: {
    id: string;
    uiSettings: {
      set: (values: Record<string, string>) => Promise<void>;
      unset: (...keys: string[]) => Promise<unknown>;
    };
    savedObjects: {
      cleanStandardList: () => Promise<void>;
    };
  };
  apiServices: {
    dataViews: {
      create: (body: {
        title: string;
        name: string;
        timeFieldName: string;
        spaceId: string;
      }) => Promise<{ data: { id?: string } }>;
      delete: (id: string, spaceId: string) => Promise<unknown>;
    };
  };
}

/**
 * Creates a space-scoped Logstash data view + common uiSettings so Visualize/Lens
 * do not redirect to the "no data views" empty state.
 */
export function createLogstashLensEditorSuiteSetup(options?: {
  timeRange?: { from: string; to: string };
  dataViewNamePrefix?: string;
}) {
  const timeRange = options?.timeRange ?? LOGSTASH_IN_RANGE_DATES;
  const namePrefix = options?.dataViewNamePrefix ?? 'scout-lens-editor-dv';
  let storedDataViewId: string | undefined;

  const beforeAll = async ({ scoutSpace, apiServices }: LogstashSpaceSetupContext) => {
    await scoutSpace.uiSettings.set({
      defaultIndex: DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: timeRange.from,
        to: timeRange.to,
      }),
    });

    const { data: dataView } = await apiServices.dataViews.create({
      title: DATA_VIEW_ID.LOGSTASH,
      name: `${namePrefix}-${Date.now()}`,
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    storedDataViewId = dataView.id;
  };

  const afterAll = async ({ scoutSpace, apiServices }: LogstashSpaceSetupContext) => {
    if (storedDataViewId) {
      await apiServices.dataViews.delete(storedDataViewId, scoutSpace.id);
    }
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  };

  return { beforeAll, afterAll };
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

/** Returns visible tag labels from the Lens tag cloud workspace. */
export async function getTagCloudTexts(page: ScoutPage): Promise<string[]> {
  // SVG <text> nodes — use css= so Playwright does not treat "text" as a text-engine query.
  const tags = page.testSubj.locator('tagCloudVisualization').locator('css=text');
  return tags.evaluateAll((elements) =>
    elements.map((el) => (el.textContent ?? '').trim()).filter((text) => text.length > 0)
  );
}

/** Clicks a tag cloud label matching `tagDisplayText`. */
export async function selectTagCloudTag(page: ScoutPage, tagDisplayText: string): Promise<void> {
  const tag = page.testSubj
    .locator('tagCloudVisualization')
    .locator('css=text')
    .filter({ hasText: new RegExp(`^${escapeRegExp(tagDisplayText)}$`) });
  await tag.waitFor({ state: 'visible' });
  // SVG <text> hit boxes from Elastic Charts are often too thin for Playwright's
  // actionability hit-test; dispatch a DOM click instead of { force: true }.
  await tag.dispatchEvent('click');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
