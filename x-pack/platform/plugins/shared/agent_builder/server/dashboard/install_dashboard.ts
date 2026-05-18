/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';

import overviewDashboardSavedObjects from './assets/overview_dashboard.json';
import tokenUsagePanel from './assets/panels/token_usage_panel.json';
import converseCountPanel from './assets/panels/converse_count_panel.json';
import converseDurationPanel from './assets/panels/converse_duration_panel.json';
import executeAgentCountPanel from './assets/panels/execute_agent_count_panel.json';
import executeAgentDurationPanel from './assets/panels/execute_agent_duration_panel.json';

const DASHBOARD_ID = 'agent-builder-token-usage';

/** Dashboard panels merged in layout order (top to bottom). */
const DASHBOARD_PANELS = [
  tokenUsagePanel,
  converseCountPanel,
  converseDurationPanel,
  executeAgentCountPanel,
  executeAgentDurationPanel,
];

function getDashboardDocument(): SavedObject<Record<string, unknown>> | undefined {
  const assets = overviewDashboardSavedObjects as SavedObject<Record<string, unknown>>[];
  const dashboard = assets.find((o) => o.type === 'dashboard');
  if (!dashboard?.attributes) {
    return undefined;
  }

  return {
    ...dashboard,
    attributes: {
      ...dashboard.attributes,
      panelsJSON: JSON.stringify(DASHBOARD_PANELS),
    },
  };
}

/**
 * Creates or overwrites the plugin-owned Agent Builder overview dashboard via the
 * Saved Objects API (programmatic create), aligned with feature-gated OOTB assets.
 */
export const installAgentBuilderDashboard = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): Promise<void> => {
  logger.debug(`Installing Agent Builder overview dashboard (${DASHBOARD_ID})...`);

  const doc = getDashboardDocument();
  if (!doc?.attributes) {
    logger.debug('No dashboard document to install');
    return;
  }

  await savedObjectsClient.create('dashboard', doc.attributes, {
    id: DASHBOARD_ID,
    references: doc.references ?? [],
    overwrite: true,
    managed: true,
    coreMigrationVersion: doc.coreMigrationVersion,
    typeMigrationVersion: doc.typeMigrationVersion,
    refresh: false,
  });

  logger.debug('Agent Builder overview dashboard installed');
};
