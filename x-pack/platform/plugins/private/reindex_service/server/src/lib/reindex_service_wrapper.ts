/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IClusterClient,
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { Version } from '@kbn/upgrade-assistant-pkg-server';
import {
  ReindexOperation,
  ReindexStatus,
  ReindexStatusResponse,
  ReindexSavedObject,
} from '@kbn/upgrade-assistant-pkg-common';
import { i18n } from '@kbn/i18n';
import { ReindexWorker } from './worker';
import { CredentialStore } from './credential_store';
import { reindexActionsFactory } from './reindex_actions';
import { reindexServiceFactory } from './reindex_service';
import { error } from './error';
import { generateNewIndexName } from './index_settings';
import { sortAndOrderReindexOperations } from './op_utils';
import { GetBatchQueueResponse, PostBatchResponse } from '../../types';
import { reindexHandler } from './reindex_handler';

export interface ReindexServiceScopedClientArgs {
  savedObjects: SavedObjectsClientContract;
  dataClient: IScopedClusterClient;
  request: KibanaRequest;
}

export interface ReindexServiceScopedClient {
  hasRequiredPrivileges: (indexName: string) => Promise<boolean>;
  reindexOrResume: (indexName: string) => Promise<ReindexOperation>;
  reindex: (indexName: string) => Promise<ReindexOperation>;
  getStatus: (indexName: string) => Promise<ReindexStatusResponse>;
  cancel: (indexName: string) => Promise<ReindexSavedObject>;
  getBatchQueueResponse: () => Promise<GetBatchQueueResponse>;
  addToBatch: (indexNames: string[]) => Promise<PostBatchResponse>;
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
}

export class ReindexServiceWrapper {
  private reindexWorker: ReindexWorker;
  private deps: {
    credentialStore: CredentialStore;
    logger: Logger;
    licensing: LicensingPluginStart;
    security: SecurityPluginStart;
    version: Version;
  };

  constructor({
    soClient,
    credentialStore,
    clusterClient,
    logger,
    licensing,
    security,
    version,
  }: ReindexServiceWrapperConstructorArgs) {
    this.deps = {
      credentialStore,
      logger,
      licensing,
      security,
      version,
    };

    this.reindexWorker = ReindexWorker.create(
      soClient,
      credentialStore, //
      clusterClient,
      logger, //
      licensing, //
      security, //
      version //
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
    savedObjects,
  }: ReindexServiceScopedClientArgs): ReindexServiceScopedClient {
    const callAsCurrentUser = dataClient.asCurrentUser;
    const reindexActions = reindexActionsFactory(
      savedObjects,
      callAsCurrentUser,
      this.deps.logger,
      this.deps.version
    );
    const reindexService = reindexServiceFactory(
      callAsCurrentUser,
      reindexActions,
      this.deps.logger,
      this.deps.licensing,
      this.deps.version
    );

    const throwIfNoPrivileges = async (indexName: string): Promise<void> => {
      if (!(await reindexService.hasRequiredPrivileges(indexName))) {
        throw error.accessForbidden(
          i18n.translate('xpack.upgradeAssistant.reindex.reindexPrivilegesErrorBatch', {
            defaultMessage: `You do not have adequate privileges to reindex "{indexName}".`,
            values: { indexName },
          })
        );
      }
    };

    return {
      getBatchQueueResponse: async (): Promise<GetBatchQueueResponse> => {
        const inProgressOps = await reindexActions.findAllByStatus(ReindexStatus.inProgress);
        const { queue } = sortAndOrderReindexOperations(inProgressOps);
        return {
          queue: queue.map((savedObject) => savedObject.attributes),
        };
      },
      addToBatch: async (indexNames: string[]): Promise<PostBatchResponse> => {
        const results: PostBatchResponse = {
          enqueued: [],
          errors: [],
        };

        for (const indexName of indexNames) {
          try {
            // todo this duplicates code in reindex method and reindexOrResume method
            const result = await reindexHandler({
              savedObjects,
              dataClient,
              indexName,
              log: this.deps.logger,
              licensing: this.deps.licensing,
              request,
              credentialStore: this.deps.credentialStore,
              reindexOptions: {
                enqueue: true,
              },
              security: this.deps.security,
              version: this.deps.version,
            });
            results.enqueued.push(result);
          } catch (e) {
            results.errors.push({
              indexName,
              message: e.message,
            });
          }
        }

        // todo make sure this happens
        /*
              if (results.errors.length < indexNames.length) {
        // Kick the worker on this node to immediately pickup the batch.
        getWorker().forceRefresh();
      }
        */
        return results;
      },
      hasRequiredPrivileges: reindexService.hasRequiredPrivileges.bind(reindexService),
      reindexOrResume: async (
        indexName: string,
        reindexOptions?: {
          enqueue?: boolean;
        }
      ): Promise<ReindexOperation> => {
        await throwIfNoPrivileges(indexName);

        const existingOp = await reindexService.findReindexOperation(indexName);

        // If the reindexOp already exists and it's paused, resume it. Otherwise create a new one.
        const reindexOp =
          existingOp && existingOp.attributes.status === ReindexStatus.paused
            ? await reindexService.resumeReindexOperation(indexName, reindexOptions)
            : await reindexService.createReindexOperation(indexName, reindexOptions);

        // Add users credentials for the worker to use
        await this.deps.credentialStore.set({ reindexOp, request, security: this.deps.security });

        return reindexOp.attributes;
      },
      // ABOVE AND BELOW add options and mappings, figure out where to move reindexOptions
      reindex: async (
        indexName: string,
        reindexOptions?: {
          enqueue?: boolean;
        }
      ): Promise<ReindexOperation> => {
        await throwIfNoPrivileges(indexName);

        const existingOp = await reindexService.findReindexOperation(indexName);

        if (existingOp) {
          throw error.reindexAlreadyInProgress(
            i18n.translate('xpack.upgradeAssistant.reindex.reindexAlreadyInProgressError', {
              defaultMessage: 'A reindex operation already in-progress for {indexName}',
              values: { indexName },
            })
          );
        }

        const reindexOp = await reindexService.createReindexOperation(indexName, reindexOptions);

        // Add users credentials for the worker to use
        await this.deps.credentialStore.set({ reindexOp, request, security: this.deps.security });

        // Kick the worker on this node to immediately pickup the new reindex operation.
        this.getWorker().forceRefresh();

        return reindexOp.attributes;
      },

      getStatus: async (indexName: string): Promise<ReindexStatusResponse> => {
        const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges(indexName);
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
            reindexName: generateNewIndexName(indexName, this.deps.version),
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

  // for legacy code, used by routes
  public getWorker(): ReindexWorker {
    if (!this.reindexWorker) {
      throw new Error('Worker unavailable');
    }
    return this.reindexWorker;
  }

  public stop() {
    this.reindexWorker.stop();
  }
}
