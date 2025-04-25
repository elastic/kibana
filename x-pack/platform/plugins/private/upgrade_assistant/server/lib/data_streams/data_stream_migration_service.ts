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
  DataStreamMigrationStatus,
  DataStreamMigrationOperation,
  DataStreamMetadata,
  DataStreamMigrationWarning,
  DataStreamReindexTaskStatusResponse,
  DataStreamReindexStatusCancelled,
} from '../../../common/types';

import { DataStreamMigrationError, error } from './error';

interface DataStreamMigrationService {
  /**
   * Checks whether or not the user has proper privileges required to migrate this index.
   * @param dataStreamName
   */
  hasRequiredPrivileges: (dataStreamName: string) => Promise<boolean>;

  /**
   * Checks an index's settings and mappings to flag potential issues during migration.
   * Resolves to null if index does not exist.
   * @param dataStreamName
   */
  detectMigrationWarnings: (
    dataStreamName: string
  ) => Promise<DataStreamMigrationWarning[] | undefined>;

  /**
   * Creates a new reindex operation for a given index.
   * @param dataStreamName
   */
  createReindexOperation: (dataStreamName: string) => Promise<boolean>;

  /**
   * Polls Elasticsearch's Data stream status API to retrieve the status of the reindex operation.
   * @param dataStreamName
   */
  fetchMigrationStatus: (dataStreamName: string) => Promise<DataStreamMigrationOperation>;

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

  /**
   * Marks the given indices as read-only.
   * First it will roll over the write index if it exists in the deprecated indices.
   * Then it will unfreeze the indices and set them to read-only.
   * @param dataStreamName
   * @param indices
   */
  readonlyIndices: (dataStreamName: string, indices: string[]) => Promise<void>;
}

export interface DataStreamMigrationServiceFactoryParams {
  esClient: ElasticsearchClient;
  log: Logger;
  licensing: LicensingPluginSetup;
}

export const dataStreamMigrationServiceFactory = ({
  esClient,
  licensing,
}: DataStreamMigrationServiceFactoryParams): DataStreamMigrationService => {
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
        cluster: ['manage', 'cancel_task'],
        index: [
          {
            names,
            allow_restricted_indices: true,
            privileges: ['all'],
          },
        ],
      });

      return resp.has_all_requested;
    },
    async detectMigrationWarnings(): Promise<DataStreamMigrationWarning[]> {
      return [
        {
          warningType: 'affectExistingSetups',
          resolutionType: 'readonly',
        },
        {
          warningType: 'incompatibleDataStream',
          resolutionType: 'reindex',
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
    async fetchMigrationStatus(dataStreamName: string): Promise<DataStreamMigrationOperation> {
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

        // Propagate errors from the reindex task even if reindexing is not yet complete.
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

        if (taskResponse.complete) {
          /**
           * If the task is complete, check if there are any remaining indices that require upgrade
           * If that is the case, we need to update the status to not started
           * This way the user can trigger a new migration.
           * Note: This is the best place to do this call because we it'll only be called
           * 1 timeonce the task is complete.
           * Cases we reach this code execution:
           *     1. Task is complete and the user has the UA open. It'll disappear once the user refreshes.
           *     2. Task is complete but we have remaining indices that require upgrade.
           */

          const { data_streams: dataStreamsDeprecations } = await esClient.migration.deprecations({
            filter_path: `data_streams`,
          });

          const deprecationsDetails = dataStreamsDeprecations[dataStreamName];
          if (deprecationsDetails && deprecationsDetails.length) {
            const deprecationDetails = deprecationsDetails.find(
              (deprecation) => deprecation._meta!.reindex_required
            );
            if (deprecationDetails) {
              const stillNeedsUpgrade =
                deprecationDetails._meta!.reindex_required === true &&
                deprecationDetails._meta!.indices_requiring_upgrade_count > 0;
              if (stillNeedsUpgrade) {
                return {
                  status: DataStreamMigrationStatus.notStarted,
                };
              }
            }
          }

          // Find the first deprecation that has reindex_required set to true
          // Update the status
          return {
            taskPercComplete: 1,
            status: DataStreamMigrationStatus.completed,
            resolutionType: 'reindex',
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
            status: DataStreamMigrationStatus.inProgress,
            taskPercComplete: perc,
            resolutionType: 'reindex',
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
            status: DataStreamMigrationStatus.notStarted,
          };
        }

        return {
          status: DataStreamMigrationStatus.failed,
          resolutionType: 'reindex',
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
        status: DataStreamMigrationStatus.cancelled,
        resolutionType: 'reindex',
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
        let oldestIncompatibleDocTimestamp: number | undefined;

        const indicesCreationDates = [];
        for (const index of indicesRequiringUpgrade) {
          const indexStats = Object.entries(statsBody.indices).find(([key]) => key === index);

          if (!indexStats) {
            throw error.cannotGrabMetadata(`Index ${index} does not exist in this cluster.`);
          }

          indicesRequiringUpgradeDocsSize += (indexStats[1] as any).primaries.store
            .total_data_set_size_in_bytes;
          indicesRequiringUpgradeDocsCount += (indexStats[1] as any).primaries.docs.count;

          const body = await esClient.indices.getSettings({
            index,
            flat_settings: true,
          });

          const creationDate = _.get(body, [index, 'settings', 'index.creation_date']);
          if (creationDate) {
            indicesCreationDates.push(creationDate);
          }

          // Check if the index has documents before checking for oldest timestamp
          if ((indexStats[1] as any).primaries.docs.count > 0) {
            try {
              // Find the oldest document timestamp in incompatible index
              const timestampResponse = await esClient.search({
                index,
                size: 0,
                aggs: {
                  oldest_incompatible_doc: { min: { field: '@timestamp' } },
                },
              });

              const oldestTimestamp =
                // @ts-ignore - value doesnt exist in the es type yet
                timestampResponse.aggregations?.oldest_incompatible_doc?.value;

              if (
                oldestTimestamp &&
                (!oldestIncompatibleDocTimestamp ||
                  oldestTimestamp < oldestIncompatibleDocTimestamp)
              ) {
                oldestIncompatibleDocTimestamp = oldestTimestamp;
              }
            } catch (err) {
              // If aggregation fails (possibly due to missing @timestamp field), continue without setting timestamp
              // This prevents a single index without proper timestamps from breaking the entire metadata function
            }
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
          oldestIncompatibleDocTimestamp,
        };
      } catch (err) {
        throw error.cannotGrabMetadata(
          `Could not grab metadata for ${dataStreamName}. ${err.message.toString()}`
        );
      }
    },

    async readonlyIndices(dataStreamName: string, indices: string[]) {
      try {
        const { data_streams: dataStreamsDetails } = await esClient.indices.getDataStream({
          name: dataStreamName,
        });
        // Since we are not using a pattern it should only return one item
        const dataStreamBackIndices = dataStreamsDetails[0].indices;

        // The last item in this array contains information about the stream’s current write index.
        const writeIndex = dataStreamBackIndices[dataStreamBackIndices.length - 1].index_name;
        const hasWriteIndex = indices.some((index) => index === writeIndex);

        if (hasWriteIndex) {
          const rollOverResponse = await esClient.indices.rollover({
            alias: dataStreamName,
          });
          if (!rollOverResponse.acknowledged) {
            throw error.readonlyTaskFailed(`Could not rollover data stream ${dataStreamName}.`);
          }
        }
      } catch (err) {
        throw error.readonlyTaskFailed(`Could not migrate data stream ${dataStreamName}.`);
      }

      for (const index of indices) {
        try {
          const addBlock = await esClient.indices.addBlock({ index, block: 'write' });

          if (!addBlock.acknowledged) {
            throw error.readonlyTaskFailed(`Could not set index ${index} to readonly.`);
          }
        } catch (err) {
          if (err instanceof DataStreamMigrationError) {
            throw err;
          }
          // ES errors are serializable, so we can just stringify the error and throw it.
          const stringifiedErr = JSON.stringify(err, null, 2);
          throw error.readonlyTaskFailed(
            `Could not migrate index "${index}". Got: ${stringifiedErr}`
          );
        }
      }
    },
  };
};
