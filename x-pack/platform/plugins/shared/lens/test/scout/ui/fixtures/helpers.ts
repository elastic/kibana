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

export interface ElasticChartDebugContext {
  addInitScript: (script: () => void) => Promise<{ dispose: () => Promise<void> }>;
}

interface LogstashLensEditorBeforeEachContext {
  browserAuth: { loginAsPrivilegedUser: () => Promise<void> };
  context: ElasticChartDebugContext;
  pageObjects: Pick<PageObjects, 'visualize' | 'lens'>;
}

/** Enables elastic-charts debug state for subsequent page loads in this browser context. */
export async function enableElasticChartDebug(context: ElasticChartDebugContext): Promise<void> {
  await context.addInitScript(() => {
    (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
  });
}

/**
 * Creates a space-scoped Logstash data view + common uiSettings so Visualize/Lens
 * do not redirect to the "no data views" empty state.
 * Returns `beforeEach` that logs in and opens an empty Lens editor (same shape as
 * `createOpenInLensSuiteSetup`).
 */
export function createLogstashLensEditorSuiteSetup(options?: {
  timeRange?: { from: string; to: string };
  /** When true, enables elastic-charts debug state before navigating to Lens. */
  enableChartDebug?: boolean;
}) {
  const timeRange = options?.timeRange ?? LOGSTASH_IN_RANGE_DATES;
  const enableChartDebug = options?.enableChartDebug ?? false;
  let storedDataViewId: string | undefined;

  const beforeAll = async ({ scoutSpace, apiServices }: LogstashSpaceSetupContext) => {
    // Name matches title so Lens data-view switcher rows resolve as `dataView-logstash-*`.
    const { data: dataView } = await apiServices.dataViews.create({
      title: DATA_VIEW_ID.LOGSTASH,
      name: DATA_VIEW_ID.LOGSTASH,
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    storedDataViewId = dataView.id;

    await scoutSpace.uiSettings.set({
      defaultIndex: storedDataViewId ?? DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: timeRange.from,
        to: timeRange.to,
      }),
    });
  };

  const beforeEach = async ({
    browserAuth,
    context,
    pageObjects,
  }: LogstashLensEditorBeforeEachContext) => {
    if (enableChartDebug) {
      await enableElasticChartDebug(context);
    }
    await browserAuth.loginAsPrivilegedUser();
    // URL navigation resets stale Visualize/Lens editor state (e.g. after Maps).
    await pageObjects.visualize.goto();
    await pageObjects.visualize.openNewVisualizationWizard();
    await pageObjects.visualize.clickVisType('lens');
    await pageObjects.lens.waitForLensApp();
  };

  const afterAll = async ({ scoutSpace, apiServices }: LogstashSpaceSetupContext) => {
    if (storedDataViewId) {
      await apiServices.dataViews.delete(storedDataViewId, scoutSpace.id);
    }
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  };

  return { beforeAll, beforeEach, afterAll };
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
