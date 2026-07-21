/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import type { PageObjects, ScoutPage } from '@kbn/scout';

import { DATA_TEST_SUBJECTS, LOGSTASH_IN_RANGE_DATES, DATA_VIEW_ID } from './constants';

interface ElasticChartDebugContext {
  addInitScript: (script: () => void) => Promise<{ dispose: () => Promise<void> }>;
}

export interface ImportedSavedObject {
  id: string;
  type: string;
  title: string;
}

interface LogstashOpenInLensSetupContext {
  savedObjects?: {
    load: (path: string) => Promise<ImportedSavedObject[]>;
    cleanStandardList: () => Promise<void>;
  };
  uiSettings: {
    setDefaultIndex: (dataViewName: string) => Promise<void>;
    set: (values: Record<string, string>) => Promise<void>;
    unset?: (...keys: string[]) => Promise<unknown>;
    setDefaultTime: (range: { from: string; to: string }) => Promise<void>;
  };
}

interface OpenInLensSuiteSetupOptions {
  archivePath: string;
  dashboardTitles: string | string[];
  openDashboardBeforeEach?: boolean;
  enableChartDebug?: boolean;
}

const OPEN_IN_LENS_UI_SETTINGS = ['defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults'];

/** Sets common Logstash UI settings used by the open-in-Lens dashboard fixtures. */
export async function setupLogstashOpenInLensDefaults({
  uiSettings,
}: LogstashOpenInLensSetupContext): Promise<void> {
  await uiSettings.setDefaultIndex(DATA_VIEW_ID.LOGSTASH);
  await uiSettings.setDefaultTime(LOGSTASH_IN_RANGE_DATES);
  await uiSettings.set({ 'dateFormat:tz': 'UTC' });
}

/** Unsets UI settings applied by `setupLogstashOpenInLensDefaults`. */
export async function cleanupLogstashOpenInLensDefaults({
  uiSettings,
}: LogstashOpenInLensSetupContext): Promise<void> {
  if (!uiSettings.unset) {
    throw new Error('scoutSpace.uiSettings.unset is required');
  }
  await uiSettings.unset(...OPEN_IN_LENS_UI_SETTINGS);
}

export function createOpenInLensSuiteSetup({
  archivePath,
  dashboardTitles,
  openDashboardBeforeEach = true,
  enableChartDebug = false,
}: OpenInLensSuiteSetupOptions) {
  const titles = Array.isArray(dashboardTitles) ? dashboardTitles : [dashboardTitles];
  const dashboardIds = new Map<string, string>();

  const getDashboardId = (dashboardTitle = titles[0]): string => {
    const dashboardId = dashboardIds.get(dashboardTitle);
    if (!dashboardId) {
      throw new Error(`Dashboard "${dashboardTitle}" was not imported`);
    }
    return dashboardId;
  };

  const beforeAll = async ({ scoutSpace }: { scoutSpace: LogstashOpenInLensSetupContext }) => {
    if (!scoutSpace.savedObjects) {
      throw new Error('scoutSpace.savedObjects is required to load Open in Lens fixtures');
    }
    const imported = await scoutSpace.savedObjects.load(archivePath);
    for (const title of titles) {
      dashboardIds.set(title, getImportedDashboardId(imported, title));
    }
    await setupLogstashOpenInLensDefaults(scoutSpace);
  };

  const beforeEach = async ({
    browserAuth,
    context,
    pageObjects,
  }: {
    browserAuth: { loginAsPrivilegedUser: () => Promise<void> };
    context: ElasticChartDebugContext;
    pageObjects: Pick<PageObjects, 'dashboard'>;
  }) => {
    if (!openDashboardBeforeEach) {
      return;
    }
    if (enableChartDebug) {
      await enableElasticChartDebug(context);
    }
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithIdInEditMode(getDashboardId());
  };

  const afterAll = async ({ scoutSpace }: { scoutSpace: LogstashOpenInLensSetupContext }) => {
    if (!scoutSpace.savedObjects) {
      throw new Error('scoutSpace.savedObjects is required to clean up Open in Lens fixtures');
    }
    await cleanupLogstashOpenInLensDefaults(scoutSpace);
    await scoutSpace.savedObjects.cleanStandardList();
  };

  return { getDashboardId, beforeAll, beforeEach, afterAll };
}

/** Resolves a dashboard id after `scoutSpace.savedObjects.load()` (createNewCopies assigns new ids). */
export function getImportedDashboardId(
  imported: ImportedSavedObject[],
  dashboardTitle: string
): string {
  const dashboard = imported.find(
    (savedObject) => savedObject.type === 'dashboard' && savedObject.title === dashboardTitle
  );
  if (!dashboard?.id) {
    throw new Error(`Dashboard "${dashboardTitle}" was not imported`);
  }
  return dashboard.id;
}

/** Clicks the "Open in Lens" panel action for the panel with the given title. */
export async function convertToLensByTitle(
  { dashboard }: Pick<PageObjects, 'dashboard'>,
  panelTitle: string
): Promise<void> {
  await dashboard.clickPanelAction(DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION, panelTitle);
}

/**
 * Returns true when the "Open in Lens" panel action is available for the panel
 * with the given title.
 */
export async function canConvertToLensByTitle(
  { dashboard }: Pick<PageObjects, 'dashboard'>,
  panelTitle: string
): Promise<boolean> {
  return dashboard.panelHasAction(DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION, panelTitle);
}

/** Enables elastic-charts debug state for subsequent page loads in this browser context. */
export async function enableElasticChartDebug(context: ElasticChartDebugContext): Promise<void> {
  await context.addInitScript(() => {
    (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
  });
}

/** Reads `@elastic/charts` debug state from a rendered chart test subject. */
export async function getChartDebugData(
  page: ScoutPage,
  chartTestSubj: string
): Promise<DebugState> {
  const chart = page.testSubj.locator('lnsWorkspace').getByTestId(chartTestSubj);
  await chart.locator('.echChartStatus[data-ech-render-complete="true"]').waitFor({
    state: 'attached',
    timeout: 30_000,
  });

  const debugJson = await chart.locator('.echChartStatus').getAttribute('data-ech-debug-state');
  if (!debugJson) {
    throw new Error(
      'Elastic charts debugState not found — call enableElasticChartDebug() before navigation'
    );
  }

  return JSON.parse(debugJson) as DebugState;
}
