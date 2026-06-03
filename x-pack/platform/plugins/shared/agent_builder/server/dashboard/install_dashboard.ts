/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import pMap from 'p-map';
import type {
  CoreStart,
  ISavedObjectsImporter,
  ISavedObjectsRepository,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsClient, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
  AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER,
} from './constants';
import overviewDashboardAsset from './assets/overview_dashboard.json';

const SYNC_CONCURRENCY = 5;

interface DashboardSavedObjectAsset {
  id: string;
  type: string;
  managed: boolean;
  coreMigrationVersion: string;
  typeMigrationVersion: string;
  references: unknown[];
  attributes: { panelsJSON: string } & Record<string, unknown>;
}

const sourceOverviewDashboard = overviewDashboardAsset as DashboardSavedObjectAsset;

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
  importer: ISavedObjectsImporter,
  logger: Logger,
  spaceId: string,
  namespace: string | undefined
): Promise<void> {
  // Substitute the namespace placeholder everywhere it appears in the saved object
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
 * sync the dashboard for all spaces. The dashboard visualizes Agent Builder
 * traces, which are only shipped to the local cluster when
 * `xpack.agentBuilder.tracing.send_to_self` is enabled, so the dashboard is
 * installed only when that flag is on and removed from every space otherwise.
 */
export async function syncAgentBuilderOverviewDashboard(
  coreStart: Pick<CoreStart, 'savedObjects'>,
  sendToSelf: boolean,
  logger: Logger
): Promise<void> {
  const client = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());
  const importer = coreStart.savedObjects.createImporter(client);

  // `space` is a hidden SO type, so it must be explicitly allowlisted on the repository.
  const spaceRepo = coreStart.savedObjects.createInternalRepository(['space']);
  const spaceIds = await getAllSpaceIds(spaceRepo);

  logger.debug(`Agent Builder dashboard sync: found ${spaceIds.length} space(s)`);

  await pMap(
    spaceIds,
    async (spaceId) => {
      const namespace = spaceId === 'default' ? undefined : spaceId;
      try {
        if (sendToSelf) {
          await installAgentBuilderOverviewDashboard(importer, logger, spaceId, namespace);
        } else {
          await removeAgentBuilderOverviewDashboard(client, logger, spaceId, namespace);
        }
      } catch (err) {
        logger.error(`Agent Builder dashboard sync failed for space "${spaceId}": ${err}`);
      }
    },
    { concurrency: SYNC_CONCURRENCY }
  );
}

/**
 * fetch the ids of every space, paging through the (hidden) `space` saved objects.
 */
async function getAllSpaceIds(spaceRepo: ISavedObjectsRepository): Promise<string[]> {
  const perPage = 100;
  const spaceIds = new Set<string>(['default']);

  for (let page = 1; ; page++) {
    const { saved_objects: batch } = await spaceRepo.find<unknown>({
      type: 'space',
      perPage,
      page,
    });

    batch.forEach((space) => spaceIds.add(space.id));

    if (batch.length < perPage) {
      break;
    }
  }

  return [...spaceIds];
}
