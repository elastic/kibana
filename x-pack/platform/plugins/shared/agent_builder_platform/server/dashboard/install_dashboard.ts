/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type {
  CoreStart,
  ISavedObjectsImporter,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsClient, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
  AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER,
} from './constants';
import { overviewDashboard } from './assets/overview_dashboard';

interface DashboardSavedObjectAsset {
  id: string;
  type: string;
  managed: boolean;
  coreMigrationVersion: string;
  typeMigrationVersion: string;
  references: unknown[];
  attributes: { panelsJSON: string; version?: number } & Record<string, unknown>;
}

const sourceOverviewDashboard = overviewDashboard as DashboardSavedObjectAsset;

/**
 * return the id of the dashboard in the given space
 */
export function overviewDashboardId(spaceId: string): string {
  return `${AGENT_BUILDER_OVERVIEW_DASHBOARD_ID}-${spaceId}`;
}

/**
 * install the dashboard in the given space using the saved objects importer
 */
async function installAgentBuilderOverviewDashboard(
  client: SavedObjectsClientContract,
  importer: ISavedObjectsImporter,
  logger: Logger,
  spaceId: string,
  namespace: string | undefined
): Promise<void> {
  const dashboard = JSON.parse(
    JSON.stringify(sourceOverviewDashboard).replaceAll(
      AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER,
      spaceId
    )
  ) as DashboardSavedObjectAsset;
  dashboard.id = overviewDashboardId(spaceId);

  const result = await importer.import({
    readStream: Readable.from([dashboard]),
    overwrite: true,
    createNewCopies: false,
    managed: true,
    namespace,
    refresh: false,
  });

  result.warnings.forEach((w) => {
    logger.warn(`Agent Builder dashboard import warning: ${JSON.stringify(w)}`);
  });

  if (!result.success) {
    const errors = (result.errors ?? []).map(
      (e) => `Couldn't import "${e.type}:${e.id}": ${JSON.stringify(e.error)}`
    );
    errors.forEach((e) => logger.error(e));
    throw new Error(errors.length > 0 ? errors[0] : 'Unknown import error');
  }

  logger.debug(`Agent Builder overview dashboard installed in space "${spaceId}"`);
}

/**
 * remove the dashboard from the given space
 */
async function removeAgentBuilderOverviewDashboard(
  client: SavedObjectsClientContract,
  logger: Logger,
  spaceId: string,
  namespace: string | undefined
): Promise<void> {
  try {
    await client.delete('dashboard', overviewDashboardId(spaceId), { namespace });
    logger.debug(`Agent Builder overview dashboard removed from space "${spaceId}"`);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      logger.debug(`Agent Builder overview dashboard already absent in space "${spaceId}"`);
      return;
    }
    throw error;
  }
}

/**
 * Installs or removes the Agent Builder tracing dashboard for a single space.
 */
export async function setAgentBuilderDashboard(
  coreStart: Pick<CoreStart, 'savedObjects'>,
  tracingEnabled: boolean,
  spaceId: string,
  logger: Logger
): Promise<void> {
  const client = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());
  const importer = coreStart.savedObjects.createImporter(client);
  const namespace = spaceId === 'default' ? undefined : spaceId;

  if (tracingEnabled) {
    await installAgentBuilderOverviewDashboard(client, importer, logger, spaceId, namespace);
  } else {
    await removeAgentBuilderOverviewDashboard(client, logger, spaceId, namespace);
  }
}
