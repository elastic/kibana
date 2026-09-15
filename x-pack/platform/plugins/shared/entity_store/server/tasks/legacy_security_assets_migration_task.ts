/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core/server';
import {
  TaskCost,
  throwRetryableError,
  throwUnrecoverableError,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server/task';
import { getErrorMessage } from '../../common';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type { EntityStoreCoreSetup } from '../types';
import { EngineDescriptorTypeName, type EngineDescriptor } from '../domain/saved_objects';
import { installSharedElasticsearchAssets } from '../domain/asset_manager/install_assets';
import { hasLegacySecurityAssets } from '../domain/asset_manager/migrate_legacy_security_assets';
import { isLegacySecurityAssetsMigrationEnabled } from '../infra/feature_flags';

const config = TasksConfig[EntityStoreTaskType.enum.legacySecurityAssetsMigration];

export const LEGACY_SECURITY_ASSETS_MIGRATION_TASK_ID = config.type;

const MAX_NAMESPACES_PER_PAGE = 10_000;

/**
 * Collects unique space IDs that already have Entity Store engine descriptors installed.
 */
export async function findInstalledEntityStoreNamespaces(coreStart: CoreStart): Promise<string[]> {
  const soClient = coreStart.savedObjects.createInternalRepository([EngineDescriptorTypeName]);
  const response = await soClient.find<EngineDescriptor>({
    type: EngineDescriptorTypeName,
    perPage: MAX_NAMESPACES_PER_PAGE,
    namespaces: ['*'],
  });

  const namespaces = new Set<string>();
  for (const savedObject of response.saved_objects) {
    for (const namespace of savedObject.namespaces ?? []) {
      if (namespace && namespace !== '*') {
        namespaces.add(namespace);
      }
    }
  }
  return Array.from(namespaces);
}

/**
 * Migrates Security-scoped `.entities.v2.*.security_{ns}` assets to solution-neutral names
 * for every space that already has the Entity Store installed. Runs as the Kibana internal
 * user so upgrade does not require a human to re-hit `/install`.
 */
export async function runLegacySecurityAssetsMigration({
  coreStart,
  logger,
  signal,
  isMigrationEnabled,
}: {
  coreStart: CoreStart;
  logger: Logger;
  signal: AbortSignal;
  isMigrationEnabled: () => Promise<boolean>;
}): Promise<{ migrated: string[]; skipped: string[] }> {
  const taskLogger = logger.get(config.type);
  if (!(await isMigrationEnabled())) {
    taskLogger.info('Skipping legacy security assets migration; feature flag is off');
    return { migrated: [], skipped: [] };
  }
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const namespaces = await findInstalledEntityStoreNamespaces(coreStart);
  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const namespace of namespaces) {
    if (signal.aborted) {
      throwRetryableError(new Error('Legacy security assets migration aborted'), true);
    }

    const needsMigration = await hasLegacySecurityAssets(esClient, namespace);
    if (!needsMigration) {
      skipped.push(namespace);
      continue;
    }

    taskLogger.info(
      `Migrating legacy Security-scoped Entity Store assets in namespace "${namespace}"`
    );
    // Templates + indices + migration + compatibility aliases as internal user: there is no
    // requesting user on the upgrade path, and ES service-account manage is required for
    // deleteIndex/deleteDataStream during migration (see elastic/elasticsearch#156386).
    await installSharedElasticsearchAssets({
      esClient,
      migrationEsClient: esClient,
      logger: taskLogger,
      namespace,
      allowLegacyMigration: true,
    });
    migrated.push(namespace);
  }

  return { migrated, skipped };
}

export function registerLegacySecurityAssetsMigrationTask({
  taskManager,
  logger,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: EntityStoreCoreSetup;
}) {
  taskManager.registerTaskDefinitions({
    [config.type]: {
      title: config.title,
      timeout: config.timeout,
      maxAttempts: 3,
      cost: TaskCost.ExtraLarge,
      paramsSchema: schema.object({}),
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          try {
            const { migrated, skipped } = await runLegacySecurityAssetsMigration({
              coreStart,
              logger,
              signal,
              isMigrationEnabled: () =>
                isLegacySecurityAssetsMigrationEnabled(coreStart.featureFlags),
            });
            logger.info(
              `Task "${config.type}" finished. Migrated namespaces: [${migrated.join(
                ', '
              )}], skipped (no legacy assets): [${skipped.join(', ')}]`
            );
            return { state: {} };
          } catch (error) {
            const err = error instanceof Error ? error : new Error(getErrorMessage(error));
            if (signal.aborted) {
              throwRetryableError(err, true);
            }
            logger.error(`Task "${config.type}" failed: ${getErrorMessage(err)}`);
            // Permanent misconfig / unexpected shape — do not spin forever.
            if (/saved object type.*not defined|unknown type/i.test(err.message)) {
              throwUnrecoverableError(err);
            }
            throwRetryableError(err, true);
          }
        },
      }),
    },
  });
}

/**
 * Schedules a one-shot upgrade migration when any installed space still has legacy
 * Security-scoped Entity Store assets. Idempotent via `ensureScheduled` + stable task id.
 */
export async function scheduleLegacySecurityAssetsMigrationIfNeeded({
  coreStart,
  taskManager,
  logger,
  isMigrationEnabled,
}: {
  coreStart: CoreStart;
  taskManager: TaskManagerStartContract;
  logger: Logger;
  isMigrationEnabled: () => Promise<boolean>;
}): Promise<void> {
  const taskLogger = logger.get(config.type);
  if (!(await isMigrationEnabled())) {
    taskLogger.info('Skipping legacy security assets migration schedule; feature flag is off');
    return;
  }
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  let namespaces: string[];
  try {
    namespaces = await findInstalledEntityStoreNamespaces(coreStart);
  } catch (error) {
    taskLogger.warn(
      `Could not list Entity Store namespaces for legacy migration scheduling: ${getErrorMessage(
        error
      )}`
    );
    return;
  }

  if (namespaces.length === 0) {
    taskLogger.debug('No installed Entity Store namespaces; skipping legacy migration schedule');
    return;
  }

  let needsMigration = false;
  for (const namespace of namespaces) {
    try {
      if (await hasLegacySecurityAssets(esClient, namespace)) {
        needsMigration = true;
        break;
      }
    } catch (error) {
      // Schedule conservatively if we cannot probe a space — the task itself is idempotent.
      taskLogger.warn(
        `Could not probe legacy assets for namespace "${namespace}": ${getErrorMessage(error)}`
      );
      needsMigration = true;
      break;
    }
  }

  if (!needsMigration) {
    taskLogger.debug(
      'No legacy Security-scoped Entity Store assets found; migration not scheduled'
    );
    return;
  }

  const now = new Date();
  try {
    await taskManager.ensureScheduled({
      id: LEGACY_SECURITY_ASSETS_MIGRATION_TASK_ID,
      taskType: config.type,
      scheduledAt: now,
      runAt: now,
      params: {},
      state: {},
    });
    taskLogger.info(`Scheduled task "${LEGACY_SECURITY_ASSETS_MIGRATION_TASK_ID}"`);
  } catch (error) {
    taskLogger.error(
      `Error scheduling ${LEGACY_SECURITY_ASSETS_MIGRATION_TASK_ID}: ${getErrorMessage(error)}`
    );
  }
}
