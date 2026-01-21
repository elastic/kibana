/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type {
  DataSourcesServerSetupDependencies,
  DataSourcesServerStartDependencies,
} from '../types';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { DataSourceAttributes } from '../saved_objects';

export const TYPE = 'data-sources:bulk-delete-task';

export interface BulkDeleteTaskState {
  isDone: boolean;
  deletedCount: number;
  errors: Array<{ dataSourceId: string; error: string }>;
}

interface TaskSetupContract {
  core: CoreSetup<DataSourcesServerStartDependencies>;
  logFactory: LoggerFactory;
  plugins: {
    [key in keyof DataSourcesServerSetupDependencies]: {
      setup: Required<DataSourcesServerSetupDependencies>[key];
    };
  } & {
    [key in keyof DataSourcesServerStartDependencies]: {
      start: () => Promise<Required<DataSourcesServerStartDependencies>[key]>;
    };
  };
}

export class BulkDeleteTask {
  private logger: Logger;

  constructor(setupContract: TaskSetupContract) {
    const { core, plugins, logFactory } = setupContract;
    this.logger = logFactory.get(TYPE);

    this.logger.debug('Registering task with [30m] timeout');

    // taskManager is guaranteed to be available here because plugin.ts checks before instantiating
    plugins.taskManager!.setup.registerTaskDefinitions({
      [TYPE]: {
        title: 'Data sources bulk delete',
        timeout: '30m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }: RunContext) => {
          return {
            run: async () => {
              this.logger.debug('Starting bulk delete operation');

              if (!fakeRequest) {
                this.logger.error('fakeRequest is not defined');
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    deletedCount: 0,
                    errors: [{ dataSourceId: 'unknown', error: 'fakeRequest is not defined' }],
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
                const finder = savedObjectsClient.createPointInTimeFinder<DataSourceAttributes>(
                  {
                    type: DATA_SOURCE_SAVED_OBJECT_TYPE,
                    perPage: 100,
                  }
                );

                try {
                  for await (const response of finder.find()) {
                    const dataSources = response.saved_objects;

                    // Collect all kscIds from this batch
                    const kscIds: string[] = dataSources.flatMap(
                      (dataSource) => dataSource.attributes.kscIds || []
                    );

                    // Delete stack connectors
                    if (kscIds.length > 0) {
                      try {
                        const deleteKscPromises = kscIds.map((kscId) =>
                          actionsClient.delete({ id: kscId }).catch((error) => {
                            this.logger.warn(
                              `Failed to delete stack connector ${kscId}: ${error.message}`
                            );
                            return null;
                          })
                        );
                        await Promise.all(deleteKscPromises);
                      } catch (error) {
                        this.logger.error(
                          `Failed to delete stack connectors: ${(error as Error).message}`
                        );
                      }
                    }

                    // Delete tools and workflows would be handled by deleteDataSourceAndRelatedResources
                    // For now, we'll just delete the saved objects
                    // In a full implementation, we'd call deleteDataSourceAndRelatedResources for each

                    // Delete data source saved objects
                    for (const dataSource of dataSources) {
                      try {
                        await savedObjectsClient.delete(
                          DATA_SOURCE_SAVED_OBJECT_TYPE,
                          dataSource.id
                        );
                        deletedCount++;
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
                      `Processed batch: ${deletedCount} deleted, ${errors.length} errors`
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
                      { dataSourceId: 'unknown', error: (err as Error).message },
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

