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
  DataStreamReindexStatusCancelled,
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
  cancelReindexing: (dataStreamName: string) => Promise<DataStreamReindexStatusCancelled>;

  /**
   * Retrieves metadata about the data stream.
   * @param dataStreamName
   */
  getDataStreamMetadata: (dataStreamName: string) => Promise<DataStreamMetadata | null>;
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
        if (err.status === 400 && err.error.type === 'resource_already_exists_exception') {
          throw error.reindexAlreadyInProgress(
            `A reindex operation already in-progress for ${dataStreamName}`
          );
        }

        throw error.reindexTaskFailed(
          `The reindex operation failed to start for ${dataStreamName}`
        );
      }
    },
    async fetchReindexStatus(dataStreamName: string): Promise<DataStreamReindexOperation> {
      // Check reindexing task progress
      try {
        const taskResponse = await esClient.transport.request<DataStreamReindexTaskStatusResponse>({
          method: 'GET',
          path: `/_migration/reindex/${dataStreamName}/_status`,
        });

        if (taskResponse.exception) {
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

          // Update the status
          return {
            reindexTaskPercComplete: 1,
            status: DataStreamReindexStatus.completed,
            progressDetails: {
              startTimeMs: taskResponse.start_time_millis,
              successCount: taskResponse.successes,
              pendingCount: taskResponse.pending,
              inProgressCount: (taskResponse.in_progress ?? []).length,
              errorsCount: (taskResponse.errors ?? []).length,
            },
          };
        } else {
          // Updated the percent complete
          const perc = taskResponse.successes / taskResponse.total_indices_in_data_stream;

          return {
            status: DataStreamReindexStatus.inProgress,
            reindexTaskPercComplete: perc,
            progressDetails: {
              startTimeMs: taskResponse.start_time_millis,
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

        return {
          status: DataStreamReindexStatus.failed,
          errorMessage: err.toString(),
        };
      }
    },
    async cancelReindexing(dataStreamName: string) {
      const resp = await esClient.transport.request<{ acknowledged: boolean }>({
        method: 'POST',
        path: `/_migration/reindex/${dataStreamName}/_cancel`,
      });

      if (!resp.acknowledged) {
        throw error.reindexCannotBeCancelled(`Could not cancel reindex.`);
      }

      return {
        status: DataStreamReindexStatus.cancelled,
      };
    },
    async getDataStreamMetadata(dataStreamName: string): Promise<DataStreamMetadata | null> {
      try {
        const { body: statsBody } = (await esClient.transport.request(
          {
            method: 'GET',
            path: `/${dataStreamName}/_stats`,
          },
          { meta: true }
        )) as TransportResult<any>;

        const { data_streams: dataStreamsDeprecations } = await esClient.migration.deprecations({
          filter_path: `data_streams`,
        });

        const deprecationsDetails = dataStreamsDeprecations[dataStreamName];
        if (!deprecationsDetails || !deprecationsDetails.length) {
          return null;
        }

        // Find the first deprecation that has reindex_required set to true
        const deprecationDetails = deprecationsDetails.find(
          (deprecation) => deprecation._meta!.reindex_required
        );
        if (!deprecationDetails) {
          return null;
        }

        const indicesRequiringUpgrade: string[] =
          deprecationDetails._meta!.indices_requiring_upgrade;
        const allIndices = Object.keys(statsBody.indices);

        let indicesRequiringUpgradeDocsCount = 0;
        let indicesRequiringUpgradeDocsSize = 0;

        const indicesCreationDates = [];
        for (const index of indicesRequiringUpgrade) {
          const indexStats = Object.entries(statsBody.indices).find(([key]) => key === index);

          if (!indexStats) {
            throw error.cannotGrabMetadata(`Index ${index} does not exist in this cluster.`);
          }

          indicesRequiringUpgradeDocsSize += (indexStats[1] as any).total.store
            .total_data_set_size_in_bytes;
          indicesRequiringUpgradeDocsCount += (indexStats[1] as any).total.docs.count;

          const body = await esClient.indices.getSettings({
            index,
            flat_settings: true,
          });

          const creationDate = _.get(body, [index, 'settings', 'index.creation_date']);
          if (creationDate) {
            indicesCreationDates.push(creationDate);
          }
        }

        const lastIndexRequiringUpgradeCreationDate = Math.max(...indicesCreationDates);

        return {
          dataStreamName,
          documentationUrl: deprecationDetails.url,
          allIndices,
          allIndicesCount: allIndices.length,
          indicesRequiringUpgrade,
          indicesRequiringUpgradeCount: indicesRequiringUpgrade.length,
          lastIndexRequiringUpgradeCreationDate,
          indicesRequiringUpgradeDocsSize,
          indicesRequiringUpgradeDocsCount,
        };
      } catch (err) {
        throw error.cannotGrabMetadata(
          `Could not grab metadata for ${dataStreamName}. ${err.message.toString()}`
        );
      }
    },
  };
};
