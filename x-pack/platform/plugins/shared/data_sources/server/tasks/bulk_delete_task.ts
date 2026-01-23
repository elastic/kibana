/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type {
  DataSourcesServerSetupDependencies,
  DataSourcesServerStartDependencies,
} from '../types';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { DataSourceAttributes } from '../saved_objects';
import { deleteDataSourceAndRelatedResources } from '../routes/data_sources_helpers';
import {
  FAKE_REQUEST_NOT_DEFINED_ERROR,
  UNKNOWN_DATA_SOURCE_ID,
  PARTIALLY_DELETED_ERROR,
} from '../../common/constants';

export const TYPE = 'data-sources:bulk-delete-task';

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
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    deletedCount: 0,
                    errors: [
                      {
                        dataSourceId: UNKNOWN_DATA_SOURCE_ID,
                        error: FAKE_REQUEST_NOT_DEFINED_ERROR,
                      },
                    ],
                  } satisfies BulkDeleteTaskState,
                };
              }

              const state = taskInstance.state as BulkDeleteTaskState;
              if (state.isDone) {
                // The task was done in the previous run,
                // we only rescheduled it once for keeping an ephemeral state for the user
                return;
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

              try {
                const finder = savedObjectsClient.createPointInTimeFinder<DataSourceAttributes>({
                  type: DATA_SOURCE_SAVED_OBJECT_TYPE,
                  perPage: 100,
                });

                try {
                  for await (const response of finder.find()) {
                    const dataSources = response.saved_objects;

                    // Process each data source individually to handle partial failures
                    for (const dataSource of dataSources) {
                      try {
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
                          // Partial deletion - saved object was updated with remaining resources
                          errors.push({
                            dataSourceId: dataSource.id,
                            error: PARTIALLY_DELETED_ERROR,
                          });
                        }
                      } catch (error) {
                        const errorMessage = (error as Error).message;
                        this.logger.error(
                          `Failed to delete data source ${dataSource.id}: ${errorMessage}`
                        );
                        errors.push({
                          dataSourceId: dataSource.id,
                          error: errorMessage,
                        });
                      }
                    }

                    this.logger.debug(
                      `Processed batch: ${deletedCount} fully deleted, ${errors.length} errors`
                    );
                  }
                } finally {
                  await finder.close();
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
              } catch (err) {
                this.logger.error(`Bulk delete error: ${(err as Error).message}`);
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    deletedCount,
                    errors: [
                      ...errors,
                      { dataSourceId: UNKNOWN_DATA_SOURCE_ID, error: (err as Error).message },
                    ],
                  } satisfies BulkDeleteTaskState,
                };
              }
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
