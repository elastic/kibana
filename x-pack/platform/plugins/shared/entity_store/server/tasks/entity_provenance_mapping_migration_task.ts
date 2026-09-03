/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import {
  TaskCost,
  TaskPriority,
  throwRetryableError,
  throwUnrecoverableError,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server/task';
import { getErrorMessage } from '../../common';
import type { EntityStoreCoreSetup } from '../types';
import { ensureLatestIndexProvenanceMapping } from '../domain/asset_manager/ensure_latest_index_mappings';
import { isEntityProvenanceEnabled } from '../infra/feature_flags';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import { findInstalledEntityStoreNamespaces } from './legacy_security_assets_migration_task';

const config = TasksConfig[EntityStoreTaskType.enum.entityProvenanceMappingMigration];

export const ENTITY_PROVENANCE_MAPPING_MIGRATION_TASK_ID = config.type;

export const runEntityProvenanceMappingMigration = async ({
  coreStart,
  logger,
  signal,
  isMigrationEnabled,
}: {
  coreStart: CoreStart;
  logger: Logger;
  signal: AbortSignal;
  isMigrationEnabled: () => Promise<boolean>;
}): Promise<{ migrated: string[]; skipped: string[] }> => {
  const taskLogger = logger.get(config.type);
  if (!(await isMigrationEnabled())) {
    taskLogger.info('Skipping entity provenance mapping migration; feature flag is off');
    return { migrated: [], skipped: [] };
  }

  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const namespaces = await findInstalledEntityStoreNamespaces(coreStart);
  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const namespace of namespaces) {
    if (signal.aborted) {
      throwRetryableError(new Error('Entity provenance mapping migration aborted'), true);
    }

    const mappingExists = await ensureLatestIndexProvenanceMapping(esClient, namespace, taskLogger);
    if (mappingExists) {
      migrated.push(namespace);
    } else {
      skipped.push(namespace);
    }
  }

  return { migrated, skipped };
};

export const registerEntityProvenanceMappingMigrationTask = ({
  taskManager,
  logger,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: EntityStoreCoreSetup;
}): void => {
  taskManager.registerTaskDefinitions({
    [config.type]: {
      title: config.title,
      timeout: config.timeout,
      maxAttempts: 3,
      cost: TaskCost.Normal,
      priority: TaskPriority.Maintenance,
      paramsSchema: schema.object({}),
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          try {
            const { migrated, skipped } = await runEntityProvenanceMappingMigration({
              coreStart,
              logger,
              signal,
              isMigrationEnabled: () => isEntityProvenanceEnabled(coreStart.featureFlags),
            });
            logger.info(
              `Task "${config.type}" finished. Migrated namespaces: [${migrated.join(
                ', '
              )}], skipped (latest index missing): [${skipped.join(', ')}]`
            );
            return { state: {} };
          } catch (error) {
            const err = error instanceof Error ? error : new Error(getErrorMessage(error));
            if (signal.aborted) {
              throwRetryableError(err, true);
            }
            logger.error(`Task "${config.type}" failed: ${getErrorMessage(err)}`);
            if (/saved object type.*not defined|unknown type/i.test(err.message)) {
              throwUnrecoverableError(err);
            }
            throwRetryableError(err, true);
          }
        },
      }),
    },
  });
};

/** Schedules the gated, idempotent mapping migration for installed Entity Store spaces. */
export const scheduleEntityProvenanceMappingMigrationIfNeeded = async ({
  coreStart,
  taskManager,
  logger,
  isMigrationEnabled,
}: {
  coreStart: CoreStart;
  taskManager: TaskManagerStartContract;
  logger: Logger;
  isMigrationEnabled: () => Promise<boolean>;
}): Promise<void> => {
  const taskLogger = logger.get(config.type);
  if (!(await isMigrationEnabled())) {
    taskLogger.info('Skipping entity provenance mapping migration schedule; feature flag is off');
    return;
  }

  let namespaces: string[];
  try {
    namespaces = await findInstalledEntityStoreNamespaces(coreStart);
  } catch (error) {
    taskLogger.warn(
      `Could not list Entity Store namespaces for provenance mapping migration: ${getErrorMessage(
        error
      )}`
    );
    return;
  }

  if (namespaces.length === 0) {
    taskLogger.debug(
      'No installed Entity Store namespaces; skipping provenance mapping migration schedule'
    );
    return;
  }

  const now = new Date();
  try {
    await taskManager.ensureScheduled({
      id: ENTITY_PROVENANCE_MAPPING_MIGRATION_TASK_ID,
      taskType: config.type,
      scheduledAt: now,
      runAt: now,
      params: {},
      state: {},
    });
    taskLogger.info(`Scheduled task "${ENTITY_PROVENANCE_MAPPING_MIGRATION_TASK_ID}"`);
  } catch (error) {
    taskLogger.error(
      `Error scheduling ${ENTITY_PROVENANCE_MAPPING_MIGRATION_TASK_ID}: ${getErrorMessage(error)}`
    );
  }
};
