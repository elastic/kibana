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
  DataStreamReindexStatus,
  DataStreamReindexOperation,
  DataStreamMetadata,
  DataStreamReindexWarning,
  DataStreamReindexTaskStatusResponse,
} from '../../../common/types';

import { error } from './error';

interface DataStreamReindexService {
  /**
   * Checks whether or not the user has proper privileges required to reindex this index.
   * @param dataStreamName
   */
  hasRequiredPrivileges: (dataStreamName: string) => Promise<boolean>;

  /**
   * Checks an index's settings and mappings to flag potential issues during reindex.
   * Resolves to null if index does not exist.
   * @param dataStreamName
   */
  detectReindexWarnings: (
    dataStreamName: string
  ) => Promise<DataStreamReindexWarning[] | undefined>;

  /**
   * Creates a new reindex operation for a given index.
   * @param dataStreamName
   */
  createReindexOperation: (dataStreamName: string) => Promise<boolean>;

  /**
   * Polls Elasticsearch's Data stream status API to retrieve the status of the reindex operation.
   * @param dataStreamName
   */
  fetchReindexStatus: (dataStreamName: string) => Promise<DataStreamReindexOperation>;

  /**
   * Cancels an in-progress reindex operation for a given index.
   * @param dataStreamName
   */
  cancelReindexing: (dataStreamName: string) => Promise<void>;

  /**
   * Retrieves metadata about the data stream.
   * @param dataStreamName
   */
  getDataStreamMetadata: (dataStreamName: string) => Promise<DataStreamMetadata>;
}

export interface DataStreamReindexServiceFactoryParams {
  esClient: ElasticsearchClient;
  log: Logger;
  licensing: LicensingPluginSetup;
}

export const dataStreamReindexServiceFactory = ({
  esClient,
  licensing,
}: DataStreamReindexServiceFactoryParams): DataStreamReindexService => {
  return {
    hasRequiredPrivileges: async (dataStreamName: string): Promise<boolean> => {
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

      const names = [dataStreamName];
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
    async detectReindexWarnings(): Promise<DataStreamReindexWarning[]> {
      return [
        {
          warningType: 'incompatibleDataStream',
        },
      ];
    },
    async createReindexOperation(dataStreamName: string) {
      const indexExists = await esClient.indices.exists({ index: dataStreamName });
      if (!indexExists) {
        throw error.indexNotFound(`Index ${dataStreamName} does not exist in this cluster.`);
      }

      try {
        const result = await esClient.transport.request<{ acknowledged: boolean }>({
          method: 'POST',
          path: '/_migration/reindex',
          body: {
            mode: 'upgrade',
            source: {
              index: dataStreamName,
            },
          },
        });

        if (!result.acknowledged) {
          throw error.reindexTaskFailed(
            `The reindex operation failed to start for ${dataStreamName}`
          );
        }

        return true;
      } catch (err) {
        console.log('err::', err);
        if (err.status === 400 && err.error.type === 'resource_already_exists_exception') {
          throw error.reindexAlreadyInProgress(
            `A reindex operation already in-progress for ${dataStreamName}`
          );
        }

        throw err;

        // return {
        //   status: ReindexStatus.failed,
        //   errorMessage: e.toString(),
        // };
      }
    },
    async fetchReindexStatus(dataStreamName: string): Promise<DataStreamReindexOperation> {
      // Check reindexing task progress

      try {
        // const taskResponse: DataStreamReindexTaskStatusResponse = {
        //   complete: false,
        //   successes: 1,
        //   total_indices_in_data_stream: 6,
        //   errors: [{ index: 'mock_index1', message: 'error in mock_index1'}],
        //   start_time_millis: 1,
        //   total_indices_requiring_upgrade: 5,
        //   in_progress: [{ index: 'mock_index1', total_doc_count: 1, reindexed_doc_count: 1 }],
        //   pending: 3,
        // };

        const taskResponse = await esClient.transport.request<DataStreamReindexTaskStatusResponse>({
          method: 'GET',
          path: `/_migration/reindex/${dataStreamName}/_status`,
        });

        console.log('taskResponse:', taskResponse);

        if (taskResponse.exception) {
          console.log('has exception!');
          // Include the entire task result in the error message. This should be guaranteed
          // to be JSON-serializable since it just came back from Elasticsearch.
          throw error.reindexTaskFailed(
            `Data Stream Reindexing exception:\n${taskResponse.exception}\n${JSON.stringify(
              taskResponse,
              null,
              2
            )}`
          );
        }

        if (taskResponse.complete) {
          // Check that no failures occurred
          if (taskResponse.errors.length) {
            console.log('has errores!');
            // Include the entire task result in the error message. This should be guaranteed
            // to be JSON-serializable since it just came back from Elasticsearch.
            throw error.reindexTaskFailed(
              `Reindexing failed with ${taskResponse.errors.length} errors:\n${JSON.stringify(
                taskResponse,
                null,
                2
              )}`
            );
          }

          console.log('marking as complete');

          // Update the status
          return {
            reindexTaskPercComplete: 1,
            status: DataStreamReindexStatus.completed,
            progressDetails: {
              successCount: taskResponse.successes,
              pendingCount: taskResponse.pending,
              inProgressCount: (taskResponse.in_progress ?? []).length,
              errorsCount: (taskResponse.errors ?? []).length,
            },
          };
        } else {
          // Updated the percent complete
          const perc = taskResponse.successes / taskResponse.total_indices_in_data_stream;
          console.log('taskResponse.successes:', taskResponse.successes);
          console.log(
            'taskResponse.total_indices_in_data_stream:',
            taskResponse.total_indices_in_data_stream
          );
          console.log('perc:', perc);

          return {
            status: DataStreamReindexStatus.inProgress,
            reindexTaskPercComplete: perc,
            progressDetails: {
              successCount: taskResponse.successes,
              pendingCount: taskResponse.pending,
              inProgressCount: (taskResponse.in_progress ?? []).length,
              errorsCount: (taskResponse.errors ?? []).length,
            },
          };
        }
      } catch (err) {
        if (
          err.name === 'ResponseError' &&
          (err.message as string).includes('resource_not_found_exception')
        ) {
          // cancelled, never started, or successful task but finished from than 24 hours ago
          // Since this API should be called as a follow up from _migrate API, we can assume that the task is not started
          return {
            status: DataStreamReindexStatus.notStarted,
          };
        }

        console.log('err::', err);
        console.log('err.status::', err.status);
        console.log('err.error::', err.error);

        return {
          status: DataStreamReindexStatus.failed,
          errorMessage: err.toString(),
        };
      }
    },
    async cancelReindexing(dataStreamName: string) {
      console.log('attempting to cancel!!!', dataStreamName);
      // const reindexOp = await this.findReindexOperation(dataStreamName);

      // if (!reindexOp) {
      //   throw error.indexNotFound(`No reindex operation found for index ${dataStreamName}`);
      // } else if (reindexOp.attributes.status !== ReindexStatus.inProgress) {
      //   throw error.reindexCannotBeCancelled(`Reindex operation is not in progress`);
      // } else if (reindexOp.attributes.lastCompletedStep !== DataStreamReindexStep.reindexStarted) {
      //   throw error.reindexCannotBeCancelled(
      //     `Reindex operation is not currently waiting for reindex task to complete`
      //   );
      // }

      console.log('attempting to cancel!!!');

      const resp = await esClient.transport.request<{ acknowledged: boolean }>({
        method: 'POST',
        path: `/_migration/reindex/${dataStreamName}/_cancel`,
      });

      if (!resp.acknowledged) {
        throw error.reindexCannotBeCancelled(`Could not cancel reindex.`);
      }
    },
    async getDataStreamMetadata(dataStreamName: string): Promise<DataStreamMetadata> {
      try {
        const { body: statsBody } = (await esClient.transport.request(
          {
            method: 'GET',
            path: `/${dataStreamName}/_stats`,
          },
          { meta: true }
        )) as TransportResult<any>;
        console.log('statsBody::', statsBody);

        const dataStreamDocCount = statsBody._all.total.docs.count;
        const dataStreamDocSize = statsBody._all.total.store.total_data_set_size_in_bytes;
        const backingIndices = Object.keys(statsBody.indices);
        console.log('backingIndices::', backingIndices);
        console.log('dataStreamDocCount::', dataStreamDocCount);
        console.log('dataStreamDocSize::', dataStreamDocSize);

        const indicesCreationDates = [];
        for (const index of backingIndices) {
          const body = await esClient.indices.getSettings({
            index,
            flat_settings: true,
          });

          const creationDate = _.get(body, [index, 'settings', 'index.creation_date']);
          if (creationDate) {
            indicesCreationDates.push(creationDate);
          }
        }

        const lastBackingIndexCreationDate = Math.max(...indicesCreationDates);

        return {
          lastBackingIndexCreationDate,
          dataStreamTotalIndicesCount: backingIndices.length,
          dataStreamTotalIndicesRequireUpgradeCount: backingIndices.length,
          dataStreamDocSize,
          dataStreamDocCount,
          backingIndices,
        };
      } catch (err) {
        console.log('err::', err);
        throw err;
      }
    },
  };
};
