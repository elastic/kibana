/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ISavedObjectsImporter, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  getResolutionRuleMonitoringDashboard,
  getResolutionRuleMonitoringDashboardId,
  getResolutionRunsDataView,
} from './resolution_runs_dashboard';

/**
 * Makes sure the "Entity resolution rule monitoring" dashboard and its data view exist in the
 * current space, and installs them when they do not. Safe to call again and again: it only looks
 * the dashboard up when it is already there. Returns whether the dashboard exists afterwards.
 * It never throws, because a monitoring dashboard must not break the page that asks for it.
 */
export const ensureResolutionRuleMonitoringDashboard = async ({
  savedObjectsClient,
  savedObjectsImporter,
  spaceId,
  logger,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: ISavedObjectsImporter;
  spaceId: string;
  logger: Logger;
}): Promise<boolean> => {
  try {
    await savedObjectsClient.get('dashboard', getResolutionRuleMonitoringDashboardId(spaceId));
    return true;
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      logger.warn(`Could not look up the resolution rule monitoring dashboard: ${error}`);
      return false;
    }
  }

  try {
    const result = await savedObjectsImporter.import({
      readStream: Readable.from([
        getResolutionRunsDataView(spaceId),
        getResolutionRuleMonitoringDashboard(spaceId),
      ]),
      managed: true,
      overwrite: true,
      createNewCopies: false,
      refresh: false,
    });
    if (!result.success) {
      const first = result.errors?.[0];
      logger.warn(
        `Could not install the resolution rule monitoring dashboard: ${
          first ? `${first.type}:${first.id} ${JSON.stringify(first.error)}` : 'unknown error'
        }`
      );
      return false;
    }
    logger.debug(`Installed the resolution rule monitoring dashboard in ${spaceId}`);
    return true;
  } catch (error) {
    logger.warn(`Could not install the resolution rule monitoring dashboard: ${error}`);
    return false;
  }
};
