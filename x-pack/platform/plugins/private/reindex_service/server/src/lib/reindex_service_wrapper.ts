/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IClusterClient,
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { getRollupJobByIndexName } from '@kbn/upgrade-assistant-pkg-server';
import { type Version } from '@kbn/upgrade-assistant-pkg-common';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { i18n } from '@kbn/i18n';
import { asyncForEach } from '@kbn/std';
import { ReindexWorker } from './worker';
import type { CredentialStore } from './credential_store';
import { reindexActionsFactory } from './reindex_actions';
import { reindexServiceFactory } from './reindex_service';
import { error } from './error';
import { sortAndOrderReindexOperations } from './op_utils';
import type { GetBatchQueueResponse, PostBatchResponse } from '../../types';
import type {
  ReindexArgs,
  ReindexOperation,
  ReindexStatusResponse,
  BatchReindexArgs,
} from '../../../common';
import type { ReindexSavedObject } from './types';

export interface ReindexServiceScopedClientArgs {
  dataClient: IScopedClusterClient;
  request: KibanaRequest;
}

export interface ReindexServiceScopedClient {
  hasRequiredPrivileges: (indexNames: string[]) => Promise<boolean>;
  reindexOrResume: ({
    indexName,
    reindexOptions,
    settings,
  }: ReindexArgs) => Promise<ReindexOperation>;
  reindex: ({ indexName, reindexOptions, settings }: ReindexArgs) => Promise<ReindexOperation>;
  getStatus: (indexName: string) => Promise<ReindexStatusResponse>;
  cancel: (indexName: string) => Promise<ReindexSavedObject>;
  getBatchQueueResponse: () => Promise<GetBatchQueueResponse>;
  addToBatch: (indexNames: ReindexArgs[]) => Promise<PostBatchResponse>;
}

export interface ReindexServiceInternalApi {
  stop: () => void;
}

export interface ReindexServiceWrapperConstructorArgs {
  soClient: SavedObjectsClientContract;
  credentialStore: CredentialStore;
  clusterClient: IClusterClient;
  logger: Logger;
  licensing: LicensingPluginStart;
  security: SecurityPluginStart;
  version: Version;
  rollupsEnabled: boolean;
  isServerless: boolean;
}

export class ReindexServiceWrapper {
  private reindexWorker: ReindexWorker;
  private deps: {
    credentialStore: CredentialStore;
    logger: Logger;
    licensing: LicensingPluginStart;
    security: SecurityPluginStart;
    soClient: SavedObjectsClientContract;
    version: Version;
    rollupsEnabled: boolean;
    isServerless: boolean;
  };

  constructor({
    soClient,
    credentialStore,
    clusterClient,
    logger,
    licensing,
    security,
    version,
    rollupsEnabled,
    isServerless,
  }: ReindexServiceWrapperConstructorArgs) {
    this.deps = {
      credentialStore,
      logger,
      licensing,
      security,
      soClient,
      version,
      rollupsEnabled,
      isServerless,
    };

    this.reindexWorker = ReindexWorker.create(
      soClient,
      credentialStore,
      clusterClient,
      logger,
      licensing,
      security,
      version,
      rollupsEnabled,
      isServerless
    );

    this.reindexWorker.start();
  }

  public getInternalApis(): ReindexServiceInternalApi {
    return {
      stop: () => this.reindexWorker.stop(),
    };
  }

  public getScopedClient({
    dataClient,
    request,
  }: ReindexServiceScopedClientArgs): ReindexServiceScopedClient {
    const callAsCurrentUser = dataClient.asCurrentUser;
    const reindexActions = reindexActionsFactory(
      this.deps.soClient,
      callAsCurrentUser,
      this.deps.logger,
      getRollupJobByIndexName,
      this.deps.rollupsEnabled
    );
    const reindexService = reindexServiceFactory(
      callAsCurrentUser,
      reindexActions,
      this.deps.logger,
      this.deps.licensing,
      this.deps.version,
      this.deps.isServerless
    );

    const throwIfNoPrivileges = async (indexName: string, newIndexName: string): Promise<void> => {
      if (!(await reindexService.hasRequiredPrivileges([indexName, newIndexName]))) {
        throw error.accessForbidden(
          i18n.translate('xpack.reindexService.reindexPrivilegesErrorBatch', {
            defaultMessage:
              'You do not have adequate privileges to reindex "{indexName}" to "{newIndexName}".',
            values: { indexName, newIndexName },
          })
        );
      }
    };

    const reindexOrResume = async ({
      indexName,
      newIndexName,
      reindexOptions,
      settings,
    }: ReindexArgs): Promise<ReindexOperation> => {
      await throwIfNoPrivileges(indexName, newIndexName);

      const existingOp = await reindexService.findReindexOperation(indexName);

      // If the reindexOp already exists and it's paused, resume it. Otherwise create a new one.
      const reindexOp =
        existingOp && existingOp.attributes.status === ReindexStatus.paused
          ? await reindexService.resumeReindexOperation(indexName, reindexOptions)
          : await reindexService.createReindexOperation({
              indexName,
              newIndexName,
              opts: reindexOptions,
              settings,
            });

      // Add users credentials for the worker to use
      await this.deps.credentialStore.set({ reindexOp, request, security: this.deps.security });

      return reindexOp.attributes;
    };

    return {
      getBatchQueueResponse: async (): Promise<GetBatchQueueResponse> => {
        const inProgressOps = await reindexActions.findAllByStatus(ReindexStatus.inProgress);
        const { queue } = sortAndOrderReindexOperations(inProgressOps);
        return {
          queue: queue.map((savedObject) => savedObject.attributes),
        };
      },
      addToBatch: async (reindexJobs: BatchReindexArgs[]): Promise<PostBatchResponse> => {
        const results: PostBatchResponse = {
          enqueued: [],
          errors: [],
        };

        await asyncForEach(
          reindexJobs,
          async ({ indexName, newIndexName, settings, reindexOptions }) => {
            try {
              const result = await reindexOrResume({
                indexName,
                newIndexName,
                settings,
                reindexOptions: { ...reindexOptions, enqueue: true },
              });
              results.enqueued.push(result);
            } catch (e) {
              results.errors.push({
                indexName,
                message: e.message,
              });
            }
          }
        );
        return results;
      },
      hasRequiredPrivileges: reindexService.hasRequiredPrivileges.bind(reindexService),
      reindexOrResume,
      reindex: async ({
        indexName,
        newIndexName,
        reindexOptions,
        settings,
      }): Promise<ReindexOperation> => {
        await throwIfNoPrivileges(indexName, newIndexName);

        const existingOp = await reindexService.findReindexOperation(indexName);

        if (
          existingOp &&
          ![ReindexStatus.cancelled, ReindexStatus.completed, ReindexStatus.failed].includes(
            existingOp.attributes.status
          )
        ) {
          throw error.reindexAlreadyInProgress(
            i18n.translate('xpack.reindexService.reindexAlreadyInProgressError', {
              defaultMessage: 'A reindex operation already in-progress for {indexName}',
              values: { indexName },
            })
          );
        }

        const reindexOp = await reindexService.createReindexOperation({
          indexName,
          newIndexName,
          opts: reindexOptions,
          settings,
        });

        // Add users credentials for the worker to use
        await this.deps.credentialStore.set({ reindexOp, request, security: this.deps.security });

        // Kick the worker on this node to immediately pickup the new reindex operation.
        this.getWorker().forceRefresh();

        return reindexOp.attributes;
      },

      getStatus: async (indexName: string): Promise<ReindexStatusResponse> => {
        const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges([indexName]);
        const reindexOp = await reindexService.findReindexOperation(indexName);
        // If the user doesn't have privileges than querying for warnings is going to fail.
        const warnings = hasRequiredPrivileges
          ? await reindexService.detectReindexWarnings(indexName)
          : [];

        const isTruthy = (value?: string | boolean): boolean => value === true || value === 'true';
        const { aliases, settings, isInDataStream, isFollowerIndex } =
          await reindexService.getIndexInfo(indexName);

        const body: ReindexStatusResponse = {
          reindexOp: reindexOp ? reindexOp.attributes : undefined,
          warnings,
          hasRequiredPrivileges,
          meta: {
            indexName,
            reindexName: reindexOp?.attributes.newIndexName,
            aliases: Object.keys(aliases),
            isFrozen: isTruthy(settings?.frozen),
            isReadonly: isTruthy(settings?.verified_read_only),
            isInDataStream,
            isFollowerIndex,
          },
        };

        return body;
      },

      cancel: async (indexName: string) => {
        return reindexService.cancelReindexing(indexName);
      },
    };
  }

  public cleanupReindexOperations(indexNames: string[]): Promise<void> {
    return this.getWorker().cleanupReindexOperations(indexNames);
  }

  private getWorker(): ReindexWorker {
    if (!this.reindexWorker) {
      throw new Error('Worker unavailable');
    }
    return this.reindexWorker;
  }

  public stop() {
    this.reindexWorker.stop();
  }
}
