/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserAuthFixture, ScoutSpaceParallelFixture, ScoutTestFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import * as testData from '../../fixtures/constants';
import type { LensPageObjects } from './page_objects';
import { getImportedDashboardId, getImportedSavedObjectId } from './saved_object_helpers';

export const configureEsqlMultiLayerEnvironment = async (
  scoutSpace: ScoutSpaceParallelFixture
): Promise<void> => {
  const savedObjects = await scoutSpace.savedObjects.load(
    testData.KBN_ARCHIVE_PATHS.ESQL_MULTI_LAYER_DASHBOARD
  );
  const dataViewId = getImportedSavedObjectId(savedObjects, 'index-pattern', 'logstash-*');
  await scoutSpace.uiSettings.set({
    defaultIndex: dataViewId,
    'dateFormat:tz': 'UTC',
    'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
  });
};

export const loadFreshEsqlMultiLayerDashboard = async ({
  scoutSpace,
  browserAuth,
  dashboard,
}: {
  scoutSpace: ScoutSpaceParallelFixture;
  browserAuth: BrowserAuthFixture;
  dashboard: LensPageObjects['dashboard'];
}): Promise<string> => {
  const savedObjects = await scoutSpace.savedObjects.load(
    testData.KBN_ARCHIVE_PATHS.ESQL_MULTI_LAYER_DASHBOARD
  );
  const dashboardId = getImportedDashboardId(savedObjects, 'ESQL Multi-layer Dashboard');
  await browserAuth.loginAsPrivilegedUser();
  await dashboard.openDashboardWithIdInEditMode(dashboardId);
  await dashboard.waitForPanelsToLoad(2);
  return dashboardId;
};

export const cleanupEsqlMultiLayerEnvironment = async (
  scoutSpace: ScoutSpaceParallelFixture
): Promise<void> => {
  await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
};

export const expectEsqlChartToRender = async (
  dashboard: ScoutTestFixtures['pageObjects']['dashboard'],
  panelId: string
): Promise<void> => {
  await dashboard.waitForRenderComplete();
  const panel = dashboard.getPanelByEmbeddableId(panelId);
  await expect(panel.locator('[data-test-subj="embeddableError"]')).toHaveCount(0);
  await expect(panel.locator('[data-test-subj="xyVisChart"]')).toBeVisible();
};
