/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';

import tokenUsageDashboardSavedObjects from './token_usage_dashboard.json';

const DASHBOARD_ID = 'agent-builder-token-usage';

function getDashboardDocument(): SavedObject<Record<string, unknown>> | undefined {
  const assets = tokenUsageDashboardSavedObjects as SavedObject<Record<string, unknown>>[];
  return assets.find((o) => o.type === 'dashboard');
}

/**
 * Creates or overwrites the plugin-owned Agent Builder token usage dashboard via the
 * Saved Objects API (programmatic create), aligned with feature-gated OOTB assets.
 */
export const installAgentBuilderDashboard = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): Promise<void> => {
  logger.debug(`Installing Agent Builder token usage dashboard (${DASHBOARD_ID})...`);

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

  logger.debug('Agent Builder token usage dashboard installed');
};
