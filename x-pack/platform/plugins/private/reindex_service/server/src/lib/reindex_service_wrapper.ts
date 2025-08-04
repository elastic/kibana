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
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
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

export interface ReindexServiceScopedClientArgs {
  savedObjects: SavedObjectsClientContract;
  dataClient: IScopedClusterClient;
  log: Logger;
  licensing: LicensingPluginSetup;
  request: KibanaRequest;
  credentialStore: CredentialStore;
  security?: SecurityPluginStart;
  version: Version;
}

export interface ReindexServiceScopedClient {
  reindexOrResume: (indexName: string) => Promise<ReindexOperation>;
  reindex: (indexName: string) => Promise<ReindexOperation>;
  getStatus: (indexName: string) => Promise<ReindexStatusResponse>;
  cancel: (indexName: string) => Promise<ReindexSavedObject>;
}

export class ReindexServiceWrapper {
  private reindexWorker: ReindexWorker;

  constructor(
    soClient: SavedObjectsClientContract,
    credentialStore: CredentialStore,
    clusterClient: IClusterClient,
    logger: Logger,
    licensing: LicensingPluginSetup,
    security: SecurityPluginStart,
    version: Version
  ) {
    this.reindexWorker = ReindexWorker.create(
      soClient,
      credentialStore,
      clusterClient,
      logger,
      licensing,
      security,
      version
    );

    this.reindexWorker.start();
  }

  public getInternalApis() {
    return {
      cleanupReindexOperations: (indexNames: string[]): Promise<void> =>
        this.reindexWorker.cleanupReindexOperations(indexNames),
      stop: () => this.reindexWorker.stop(),
      getWorker: () => this.reindexWorker,
    };
  }

  public async cleanupReindexOperations(indexNames: string[]): Promise<void> {
    return this.reindexWorker.cleanupReindexOperations(indexNames);
  }

  public getScopedClient({
    credentialStore,
    dataClient,
    request,
    licensing,
    log,
    savedObjects,
    security,
    version,
  }: ReindexServiceScopedClientArgs): ReindexServiceScopedClient {
    const callAsCurrentUser = dataClient.asCurrentUser;
    const reindexActions = reindexActionsFactory(savedObjects, callAsCurrentUser, log, version);
    const reindexService = reindexServiceFactory(
      callAsCurrentUser,
      reindexActions,
      log,
      licensing,
      version
    );

    return {
      reindexOrResume: async (
        indexName: string,
        reindexOptions?: {
          enqueue?: boolean;
        }
      ): Promise<ReindexOperation> => {
        if (!(await reindexService.hasRequiredPrivileges(indexName))) {
          throw error.accessForbidden(
            i18n.translate('xpack.upgradeAssistant.reindex.reindexPrivilegesErrorBatch', {
              defaultMessage: `You do not have adequate privileges to reindex "{indexName}".`,
              values: { indexName },
            })
          );
        }

        const existingOp = await reindexService.findReindexOperation(indexName);

        // If the reindexOp already exists and it's paused, resume it. Otherwise create a new one.
        const reindexOp =
          existingOp && existingOp.attributes.status === ReindexStatus.paused
            ? await reindexService.resumeReindexOperation(indexName, reindexOptions)
            : await reindexService.createReindexOperation(indexName, reindexOptions);

        // Add users credentials for the worker to use
        await credentialStore.set({ reindexOp, request, security });

        return reindexOp.attributes;
      },

      reindex: async (
        indexName: string,
        reindexOptions?: {
          enqueue?: boolean;
        }
      ): Promise<ReindexOperation> => {
        // todo share this
        if (!(await reindexService.hasRequiredPrivileges(indexName))) {
          throw error.accessForbidden(
            i18n.translate('xpack.upgradeAssistant.reindex.reindexPrivilegesErrorBatch', {
              defaultMessage: `You do not have adequate privileges to reindex "{indexName}".`,
              values: { indexName },
            })
          );
        }

        const existingOp = await reindexService.findReindexOperation(indexName);

        if (existingOp) {
          // todo clean this up
          throw new Error('Reindex operation already exists');
        }

        const reindexOp = await reindexService.createReindexOperation(indexName, reindexOptions);

        // Add users credentials for the worker to use
        await credentialStore.set({ reindexOp, request, security });

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
            reindexName: generateNewIndexName(indexName, version),
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
