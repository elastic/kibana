/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { firstValueFrom } from 'rxjs';

import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import { TransportResult } from '@elastic/elasticsearch';
import _ from 'lodash';
import {
  DataStreamReindexSavedObject,
  ReindexStatus,
  DataStreamReindexStep,
  DataStreamMetadata,
  DataStreamReindexWarning,
  DataStreamReindexTaskStatusResponse,
} from '../../../common/types';

import { DataStreamReindexActions } from './data_stream_actions';

import { error } from './error';

export interface DataStreamReindexService {
  /**
   * Checks whether or not the user has proper privileges required to reindex this index.
   * @param indexName
   */
  hasRequiredPrivileges(indexName: string): Promise<boolean>;

  /**
   * Checks an index's settings and mappings to flag potential issues during reindex.
   * Resolves to null if index does not exist.
   * @param indexName
   */
  detectReindexWarnings(indexName: string): Promise<DataStreamReindexWarning[] | undefined>;

  /**
   * Creates a new reindex operation for a given index.
   * @param indexName
   * @param opts Additional options when creating a new reindex operation
   */
  createReindexOperation(indexName: string): Promise<DataStreamReindexSavedObject>;

  /**
   * Retrieves all reindex operations that have the given status.
   * @param status
   */
  findAllByStatus(status: ReindexStatus): Promise<DataStreamReindexSavedObject[]>;

  /**
   * Finds the reindex operation for the given index.
   * Resolves to null if there is no existing reindex operation for this index.
   * @param indexName
   */
  findReindexOperation(indexName: string): Promise<DataStreamReindexSavedObject | null>;

  /**
   * Delete reindex operations for completed indices with deprecations.
   * @param indexNames
   */
  cleanupReindexOperations(indexNames: string[]): Promise<void> | null;

  /**
   * Process the reindex operation through one step of the state machine and resolves
   * to the updated reindex operation.
   * @param reindexOp
   */
  processNextStep(reindexOp: DataStreamReindexSavedObject): Promise<DataStreamReindexSavedObject>;

  /**
   * Pauses the in-progress reindex operation for a given index.
   * @param indexName
   */
  pauseReindexOperation(indexName: string): Promise<DataStreamReindexSavedObject>;

  /**
   * Resumes the paused reindex operation for a given index.
   * @param indexName
   * @param opts As with {@link createReindexOperation} we support this setting.
   */
  resumeReindexOperation(indexName: string): Promise<DataStreamReindexSavedObject>;

  /**
   * Update the update_at field on the reindex operation
   *
   * @remark
   * Currently also sets a startedAt field on the SavedObject, not really used
   * elsewhere, but is an indication that the object has started being processed.
   *
   * @param indexName
   */
  startQueuedReindexOperation(indexName: string): Promise<DataStreamReindexSavedObject>;

  /**
   * Cancel an in-progress reindex operation for a given index. Only allowed when the
   * reindex operation is in the DataStreamReindexStep.reindexStarted step. Relies on the ReindexWorker
   * to continue processing the reindex operation to detect that the Reindex Task in ES has been
   * cancelled.
   * @param indexName
   */
  cancelReindexing(indexName: string): Promise<DataStreamReindexSavedObject>;

  getDataStreamStats(indexName: string): Promise<DataStreamMetadata>;
}

export const dataStreamReindexServiceFactory = (
  esClient: ElasticsearchClient,
  actions: DataStreamReindexActions,
  log: Logger,
  licensing: LicensingPluginSetup
): DataStreamReindexService => {
  // ------ Utility functions
  const cleanupChanges = async (reindexOp: DataStreamReindexSavedObject) => {
    // Cancel reindex task if it was started but not completed
    if (reindexOp.attributes.lastCompletedStep === DataStreamReindexStep.reindexStarted) {
      try {
        await esClient.transport.request({
          method: 'POST',
          path: `/_migration/reindex/${reindexOp.attributes.reindexTaskId}/_cancel`,
        });
      } catch (err) {
        // Ignore any exceptions trying to cancel (it may have already completed).
      }
    }

    return reindexOp;
  };

  /**
   * Begins the reindex process via Elasticsearch's Reindex API.
   * @param reindexOp
   */
  const startReindexing = async (reindexOp: DataStreamReindexSavedObject) => {
    const { indexName, reindexOptions } = reindexOp.attributes;

    await esClient.transport.request({
      method: 'POST',
      path: '/_migration/reindex',
      body: {
        mode: 'upgrade',
        source: {
          index: indexName,
        },
      },
    });

    return actions.updateReindexOp(reindexOp, {
      lastCompletedStep: DataStreamReindexStep.reindexStarted,
      // index name is the name of the task ID
      reindexTaskId: indexName,
      reindexTaskPercComplete: 0,
      reindexOptions,
    });
  };

  /**
   * Polls Elasticsearch's Tasks API to see if the reindex operation has been completed.
   * @param reindexOp
   */
  const updateReindexStatus = async (reindexOp: DataStreamReindexSavedObject) => {
    const taskId = reindexOp.attributes.reindexTaskId!;

    // Check reindexing task progress

    console.log('taskId::', taskId);
    try {
      const taskResponse: DataStreamReindexTaskStatusResponse = {
        complete: false,
        successes: 1,
        total_indices_in_data_stream: 6,
        errors: [{ index: 'mock_index1', message: 'error in mock_index1'}],
        start_time_millis: 1,
        total_indices_requiring_upgrade: 5,
        in_progress: [{ index: 'mock_index1', total_doc_count: 1, reindexed_doc_count: 1 }],
        pending: 3,
      };

      // const taskResponse = await esClient.transport.request<DataStreamReindexTaskStatusResponse>({
      //   method: 'GET',
      //   path: `/_migration/reindex/${taskId}/_status`,
      // });


      console.log('taskResponse:', taskResponse);

      if (taskResponse.exception) {
        console.log('has exception!');
        // Include the entire task result in the error message. This should be guaranteed
        // to be JSON-serializable since it just came back from Elasticsearch.
        throw error.reindexTaskFailed(
          `Data Stream Reindexing exception: ${JSON.stringify(taskResponse)}`
        );
      }

      if (taskResponse.complete) {
        // Check that no failures occurred
        if (taskResponse.errors.length) {
          console.log('has errores!');
          // Include the entire task result in the error message. This should be guaranteed
          // to be JSON-serializable since it just came back from Elasticsearch.
          throw error.reindexTaskFailed(`Reindexing failed: ${JSON.stringify(taskResponse)}`);
        }

        console.log('marking as complete');

        // Update the status
        return await actions.updateReindexOp(reindexOp, {
          lastCompletedStep: DataStreamReindexStep.reindexCompleted,
          reindexTaskPercComplete: 1,
          taskStatus: {
            successCount: taskResponse.successes,
            pendingCount: taskResponse.pending,
            inProgressCount: (taskResponse.in_progress ?? []).length,
            errorsCount: (taskResponse.errors ?? []).length,
          },
        });
      } else {
        // Updated the percent complete
        const perc = taskResponse.successes / taskResponse.total_indices_in_data_stream;
        console.log('taskResponse.successes:', taskResponse.successes);
        console.log(
          'taskResponse.total_indices_in_data_stream:',
          taskResponse.total_indices_in_data_stream
        );
        console.log('perc:', perc);

        return await actions.updateReindexOp(reindexOp, {
          reindexTaskPercComplete: perc,
          taskStatus: {
            successCount: taskResponse.successes,
            pendingCount: taskResponse.pending,
            inProgressCount: (taskResponse.in_progress ?? []).length,
            errorsCount: (taskResponse.errors ?? []).length,
          },
        });
      }
    } catch (err) {
      if (err.status === 404 && err.error.type === 'resource_not_found_exception') {
        // There is no way to differentiate between cancelled tasks and never started tasks.
        // if we get 404 not found then it is cancelled by the user or never started
        // since we are already in the inProgress step this means that the task has been started
        // leaving us with the cencelled status
        reindexOp = await actions.updateReindexOp(reindexOp, {
          status: ReindexStatus.cancelled,
          taskStatus: undefined,
        });

        // Do any other cleanup work necessary
        return await cleanupChanges(reindexOp);
      } else {
        // throw err if it is not a 404 (on task exceptions)
        throw err;
      }
    }
    return reindexOp;
  };

  // ------ The service itself

  return {
    async hasRequiredPrivileges(indexName: string) {
      /**
       * To avoid a circular dependency on Security we use a work around
       * here to detect whether Security is available and enabled
       * (i.e., via the licensing plugin). This enables Security to use
       * functionality exposed through Upgrade Assistant.
       */
      const license = await firstValueFrom(licensing.license$);

      const securityFeature = license.getFeature('security');

      // If security is disabled or unavailable, return true.
      if (!securityFeature || !(securityFeature.isAvailable && securityFeature.isEnabled)) {
        return true;
      }

      const names = [indexName];
      const resp = await esClient.security.hasPrivileges({
        body: {
          cluster: ['manage', 'cancel_task'],
          index: [
            {
              names,
              allow_restricted_indices: true,
              privileges: ['all'],
            },
          ],
        },
      });

      return resp.has_all_requested;
    },

    async detectReindexWarnings(
      indexName: string
    ): Promise<DataStreamReindexWarning[] | undefined> {
      return [
        {
          warningType: 'incompatibleDataStream',
        },
      ];
    },

    async createReindexOperation(indexName: string) {
      const indexExists = await esClient.indices.exists({ index: indexName });
      if (!indexExists) {
        throw error.indexNotFound(`Index ${indexName} does not exist in this cluster.`);
      }

      const existingReindexOps = await actions.findReindexOperations(indexName);
      if (existingReindexOps.total !== 0) {
        const existingOp = existingReindexOps.saved_objects[0];
        if (
          existingOp.attributes.status === ReindexStatus.failed ||
          existingOp.attributes.status === ReindexStatus.cancelled
        ) {
          // Delete the existing one if it failed or was cancelled to give a chance to retry.
          await actions.deleteReindexOp(existingOp);
        } else {
          throw error.reindexAlreadyInProgress(
            `A reindex operation already in-progress for ${indexName}`
          );
        }
      }

      return actions.createReindexOp(indexName);
    },

    async findReindexOperation(indexName: string) {
      const findResponse = await actions.findReindexOperations(indexName);

      // Bail early if it does not exist or there is more than one.
      if (findResponse.total === 0) {
        return null;
      } else if (findResponse.total > 1) {
        throw error.multipleReindexJobsFound(
          `More than one reindex operation found for ${indexName}`
        );
      }

      return findResponse.saved_objects[0];
    },

    async cleanupReindexOperations(indexNames: string[]) {
      const performCleanup = async (indexName: string) => {
        const existingReindexOps = await actions.findReindexOperations(indexName);

        if (existingReindexOps && existingReindexOps.total !== 0) {
          const existingOp = existingReindexOps.saved_objects[0];
          if (existingOp.attributes.status === ReindexStatus.completed) {
            // Delete the existing one if its status is completed, but still contains deprecation warnings
            // example scenario: index was upgraded, but then deleted and restored with an old snapshot
            await actions.deleteReindexOp(existingOp);
          }
        }
      };

      await Promise.all(indexNames.map(performCleanup));
    },

    findAllByStatus: actions.findAllByStatus,

    async processNextStep(reindexOp: DataStreamReindexSavedObject) {
      return actions.runWhileLocked(reindexOp, async (lockedReindexOp) => {
        try {
          switch (lockedReindexOp.attributes.lastCompletedStep) {
            case DataStreamReindexStep.created: {
              console.log('starting created reindexing status');
              lockedReindexOp = await startReindexing(lockedReindexOp);
              break;
            }

            case DataStreamReindexStep.reindexCompleted: {
              console.log('setting as complete');
              await actions.updateReindexOp(lockedReindexOp, {
                status: ReindexStatus.completed,
              });
            }

            default: {
              console.log(
                'Data streams UNKNOWN last Completed step STATE: ',
                lockedReindexOp.attributes.lastCompletedStep
              );
            }
            case DataStreamReindexStep.reindexStarted: {
              console.log('updating status');
              lockedReindexOp = await updateReindexStatus(lockedReindexOp);
              break;
            }
          }
        } catch (e) {
          log.error(`Reindexing step failed: ${e instanceof Error ? e.stack : e.toString()}`);
          console.log('caught errorrrr', e);

          // Trap the exception and add the message to the object so the UI can display it.
          lockedReindexOp = await actions.updateReindexOp(lockedReindexOp, {
            status: ReindexStatus.failed,
            errorMessage: e.toString(),
          });

          // Cleanup any changes, ignoring any errors.
          lockedReindexOp = await cleanupChanges(lockedReindexOp).catch((err) => lockedReindexOp);
        }

        return lockedReindexOp;
      });
    },

    async pauseReindexOperation(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw new Error(`No reindex operation found for index ${indexName}`);
      }

      return actions.runWhileLocked(reindexOp, async (op) => {
        if (op.attributes.status === ReindexStatus.paused) {
          // Another node already paused the operation, don't do anything
          return reindexOp;
        } else if (op.attributes.status !== ReindexStatus.inProgress) {
          throw new Error(`Reindex operation must be inProgress in order to be paused.`);
        }

        return actions.updateReindexOp(op, { status: ReindexStatus.paused });
      });
    },

    async resumeReindexOperation(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw new Error(`No reindex operation found for index ${indexName}`);
      }

      return actions.runWhileLocked(reindexOp, async (op) => {
        if (op.attributes.status === ReindexStatus.inProgress) {
          // Another node already resumed the operation, don't do anything
          return reindexOp;
        } else if (op.attributes.status !== ReindexStatus.paused) {
          throw new Error(`Reindex operation must be paused in order to be resumed.`);
        }

        return actions.updateReindexOp(op, {
          status: ReindexStatus.inProgress,
        });
      });
    },

    async startQueuedReindexOperation(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw error.indexNotFound(`No reindex operation found for index ${indexName}`);
      }

      console.log('reindexOp.attributes:', reindexOp.attributes);
      if (!reindexOp.attributes.reindexOptions?.queueSettings) {
        console.log('reindexOp.attributes.reindexOptions::', reindexOp.attributes.reindexOptions);
        throw error.reindexIsNotInQueue(`Reindex operation ${indexName} is not in the queue.`);
      }

      return actions.runWhileLocked(reindexOp, async (lockedReindexOp) => {
        const { reindexOptions } = lockedReindexOp.attributes;
        reindexOptions!.queueSettings!.startedAt = Date.now();
        return actions.updateReindexOp(lockedReindexOp, {
          reindexOptions,
        });
      });
    },

    async cancelReindexing(indexName: string) {
      console.log('attempting to cancel!!!', indexName);
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw error.indexNotFound(`No reindex operation found for index ${indexName}`);
      } else if (reindexOp.attributes.status !== ReindexStatus.inProgress) {
        throw error.reindexCannotBeCancelled(`Reindex operation is not in progress`);
      } else if (reindexOp.attributes.lastCompletedStep !== DataStreamReindexStep.reindexStarted) {
        throw error.reindexCannotBeCancelled(
          `Reindex operation is not currently waiting for reindex task to complete`
        );
      }

      console.log('attempting to cancel!!!');
      
      const resp = await esClient.transport.request<{ acknowledged: boolean }>({
        method: 'POST',
        path: `/_migration/reindex/${reindexOp.attributes.reindexTaskId}/_cancel`,
      });


      if (!resp.acknowledged) {
        throw error.reindexCannotBeCancelled(`Could not cancel reindex.`);
      }

      return reindexOp;
    },
    async getDataStreamStats(indexName: string) {
      try {
        const { body: statsBody } = (await esClient.transport.request(
          {
            method: 'GET',
            path: `/${indexName}/_stats`,
          },
          { meta: true }
        )) as TransportResult<any>;
        console.log('statsBody::', statsBody);

        const dataStreamDocCount = statsBody._all.total.docs.count;
        const dataStreamDocSize = statsBody._all.total.store.total_data_set_size_in_bytes;
        const indices = Object.keys(statsBody.indices);
        console.log('indices::', indices);
        console.log('dataStreamDocCount::', dataStreamDocCount);
        console.log('dataStreamDocSize::', dataStreamDocSize);

        const indicesCreationDates = [];
        for (const index of indices) {
          const body = await esClient.indices.getSettings({
            index,
            flat_settings: true,
          });

          const creationDate = _.get(body, [index, 'settings', 'index.creation_date']);
          if (creationDate) {
            indicesCreationDates.push(creationDate);
          }
        }

        const lastIndexCreationDate = Math.max(...indicesCreationDates);

        return {
          indexName,
          lastIndexCreationDate,
          dataStreamTotalIndicesCount: indices.length,
          dataStreamTotalIndicesRequireUpgradeCount: indices.length,
          dataStreamDocSize,
          dataStreamDocCount,
          indices,
        };
      } catch (err) {
        console.log('err::', err);
        throw err;
      }
    },
  };
};
