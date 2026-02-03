/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type {
  DataSourcesServerSetupDependencies,
  DataSourcesServerStartDependencies,
} from '../types';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { DataSourceAttributes } from '../saved_objects';
import { deleteDataSourceAndRelatedResources } from '../routes/data_sources_helpers';
import { FAKE_REQUEST_NOT_DEFINED_ERROR, PARTIALLY_DELETED_ERROR } from '../../common/constants';

export const TYPE = 'data-sources:bulk-delete-task';

export interface BulkDeleteTaskParams {
  dataSourceIds: string[];
}

export interface BulkDeleteTaskState {
  isDone: boolean;
  deletedCount: number;
  errors: Array<{ dataSourceId: string; error: string }>;
}

interface TaskSetupContract {
  core: CoreSetup<DataSourcesServerStartDependencies>;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  workflowManagement: DataSourcesServerSetupDependencies['workflowsManagement'];
}

export class BulkDeleteTask {
  private logger: Logger;

  constructor(setupContract: TaskSetupContract) {
    const { core, taskManager, logFactory, workflowManagement } = setupContract;
    this.logger = logFactory.get(TYPE);

    this.logger.debug('Registering task with [30m] timeout');

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'Data sources bulk delete',
        timeout: '30m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }: RunContext) => {
          return {
            run: async () => {
              this.logger.debug('Starting bulk delete operation');

              if (!fakeRequest) {
                this.logger.error(FAKE_REQUEST_NOT_DEFINED_ERROR);
                return;
              }

              const state = taskInstance.state as BulkDeleteTaskState;
              if (state.isDone) {
                // The task was done in the previous run,
                // we only rescheduled it once for keeping an ephemeral state for the user
                return;
              }

              const params = taskInstance.params as BulkDeleteTaskParams;
              const dataSourceIds = params?.dataSourceIds ?? [];
              if (dataSourceIds.length === 0) {
                this.logger.debug('Bulk delete task has no data source IDs to delete');
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    deletedCount: 0,
                    errors: [],
                  } satisfies BulkDeleteTaskState,
                };
              }

              const [coreStart, pluginStart] = await core.getStartServices();

              const savedObjectsClient = coreStart.savedObjects.getScopedClient(fakeRequest);
              const actionsClient = await pluginStart.actions.getActionsClientWithRequest(
                fakeRequest
              );
              const toolRegistry = await pluginStart.agentBuilder.tools.getRegistry({
                request: fakeRequest,
              });

              let deletedCount = 0;
              const errors: Array<{ dataSourceId: string; error: string }> = [];

              for (const id of dataSourceIds) {
                abortController.signal.throwIfAborted();
                try {
                  const dataSource = await savedObjectsClient.get<DataSourceAttributes>(
                    DATA_SOURCE_SAVED_OBJECT_TYPE,
                    id
                  );

                  const result = await deleteDataSourceAndRelatedResources({
                    dataSource,
                    savedObjectsClient,
                    actionsClient,
                    toolRegistry,
                    workflowManagement,
                    request: fakeRequest,
                    logger: this.logger,
                  });

                  if (result.fullyDeleted) {
                    deletedCount++;
                  } else {
                    errors.push({
                      dataSourceId: id,
                      error: PARTIALLY_DELETED_ERROR,
                    });
                  }
                } catch (error) {
                  if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
                    // Already deleted (e.g. by another process); skip
                    this.logger.debug(`Data source ${id} not found, skipping`);
                    continue;
                  }
                  const errorMessage = (error as Error).message;
                  this.logger.error(`Failed to delete data source ${id}: ${errorMessage}`);
                  errors.push({
                    dataSourceId: id,
                    error: errorMessage,
                  });
                }
              }

              this.logger.info(
                `Bulk delete completed: ${deletedCount} data sources deleted, ${errors.length} errors`
              );

              return {
                runAt: new Date(Date.now() + 60 * 60 * 1000),
                state: {
                  isDone: true,
                  deletedCount,
                  errors,
                } satisfies BulkDeleteTaskState,
              };
            },
            cancel: async () => {
              this.logger.debug('Bulk delete task cancelled');
            },
          };
        },
      },
    });
  }
}
