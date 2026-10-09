/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects } from '@kbn/scout';

import {
  DATA_TEST_SUBJECTS,
  LOGSTASH_IN_RANGE_DATES,
  DATA_VIEW_ID,
} from '../../../common/ui/fixtures/constants';
import {
  getImportedDashboardId,
  type ImportedSavedObject,
} from '../../../common/ui/fixtures/saved_object_helpers';
import {
  enableElasticChartDebug,
  type ElasticChartDebugContext,
} from '../../../common/ui/fixtures/helpers';

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
