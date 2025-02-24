/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreStart, IScopedClusterClient } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskInstance,
} from '@kbn/task-manager-plugin/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { savedObjectClientsFactory } from './util';
import { mlSavedObjectServiceFactory } from './service';
import { syncSavedObjectsFactory } from './sync';

const SAVED_OBJECTS_SYNC_TASK_TYPE = 'ML:saved-objects-sync';
const SAVED_OBJECTS_SYNC_TASK_ID = 'ML:saved-objects-sync-task';
const SAVED_OBJECTS_SYNC_INTERVAL_DEFAULT = '1h';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
const stateSchemaByVersion = {
  1: {
    // A task that was created < 8.10 will go through this "up" migration
    // to ensure it matches the v1 schema.
    up: (state: Record<string, unknown>) => ({
      runs: state.runs || 0,
      totalSavedObjectsSynced: state.totalSavedObjectsSynced || 0,
    }),
    schema: schema.object({
      runs: schema.number(),
      totalSavedObjectsSynced: schema.number(),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export class SavedObjectsSyncService {
  private core: CoreStart | null = null;
  private log: { error: (t: string, e?: Error) => void; [l: string]: (t: string) => void };

  constructor(logger: Logger) {
    this.log = createLocalLogger(logger, `Task ${SAVED_OBJECTS_SYNC_TASK_ID}: `);
  }

  public registerSyncTask(
    taskManager: TaskManagerSetupContract,
    security: SecurityPluginSetup | undefined,
    spacesEnabled: boolean,
    isMlReady: () => Promise<void>
  ) {
    taskManager.registerTaskDefinitions({
      [SAVED_OBJECTS_SYNC_TASK_TYPE]: {
        title: 'ML saved objet sync',
        description: "This task periodically syncs ML's saved objects",
        timeout: '1m',
        maxAttempts: 3,
        stateSchemaByVersion,

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              await isMlReady();
              const core = this.core;
              const state = taskInstance.state as LatestTaskStateSchema;

              if (core === null || security === null || spacesEnabled === null) {
                const error = 'dependencies not initialized';
                this.log.error(error);
                throw new Error(error);
              }
              const client = core.elasticsearch.client as unknown as IScopedClusterClient;

              const { getInternalSavedObjectsClient } = savedObjectClientsFactory(
                () => core.savedObjects
              );
              const savedObjectsClient = getInternalSavedObjectsClient();
              if (savedObjectsClient === null) {
                const error = 'Internal saved object client not initialized';
                this.log.error(error);
                throw new Error(error);
              }

              const mlSavedObjectService = mlSavedObjectServiceFactory(
                savedObjectsClient,
                savedObjectsClient,
                spacesEnabled,
                security?.authz,
                client,
                isMlReady
              );
              const { initSavedObjects } = syncSavedObjectsFactory(client, mlSavedObjectService);
              const { jobs, trainedModels } = await initSavedObjects(false);
              const count = jobs.length + trainedModels.length;

              this.log.info(
                count
                  ? `${count} ML saved object${count > 1 ? 's' : ''} synced`
                  : 'No ML saved objects in need of synchronization'
              );

              const updatedState: LatestTaskStateSchema = {
                runs: state.runs + 1,
                totalSavedObjectsSynced: state.totalSavedObjectsSynced + count,
              };

              return {
                state: updatedState,
              };
            },
            cancel: async () => {
              this.log.warn('timed out');
            },
          };
        },
      },
    });
  }

  public async scheduleSyncTask(
    taskManager: TaskManagerStartContract,
    core: CoreStart
  ): Promise<TaskInstance | null> {
    this.core = core;
    try {
      await taskManager.removeIfExists(SAVED_OBJECTS_SYNC_TASK_ID);
      const state: LatestTaskStateSchema = {
        runs: 0,
        totalSavedObjectsSynced: 0,
      };
      const taskInstance = await taskManager.ensureScheduled({
        id: SAVED_OBJECTS_SYNC_TASK_ID,
        taskType: SAVED_OBJECTS_SYNC_TASK_TYPE,
        schedule: {
          interval: SAVED_OBJECTS_SYNC_INTERVAL_DEFAULT,
        },
        params: {},
        state,
        scope: ['ml'],
      });

      this.log.info(`scheduled with interval ${taskInstance.schedule?.interval}`);

      return taskInstance;
    } catch (e) {
      this.log.error(`Error running task: ${SAVED_OBJECTS_SYNC_TASK_ID}, `, e?.message ?? e);
      return null;
    }
  }

  public async unscheduleSyncTask(taskManager: TaskManagerStartContract) {
    await taskManager.removeIfExists(SAVED_OBJECTS_SYNC_TASK_ID);
  }
}

function createLocalLogger(logger: Logger, preText: string) {
  return {
    info: (text: string) => logger.info(`${preText}${text}`),
    warn: (text: string) => logger.warn(`${preText}${text}`),
    error: (text: string, e?: Error) => logger.error(`${preText}${text} ${e ?? ''}`),
  };
}
