/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';

import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { ReindexStatus, type Version } from '@kbn/upgrade-assistant-pkg-common';
import { getRollupJobByIndexName } from '@kbn/upgrade-assistant-pkg-server';
import { type ReindexOperation } from '../../../common';

import { reindexActionsFactory } from './reindex_actions';
import { reindexServiceFactory } from './reindex_service';
import type { CredentialStore } from './credential_store';
import { error } from './error';

interface ReindexHandlerArgs {
  savedObjects: SavedObjectsClientContract;
  dataClient: IScopedClusterClient;
  indexName: string;
  newIndexName: string;
  log: Logger;
  licensing: LicensingPluginStart;
  request: KibanaRequest;
  credentialStore: CredentialStore;
  reindexOptions?: {
    enqueue?: boolean;
  };
  security?: SecurityPluginStart;
  version: Version;
  rollupsEnabled: boolean;
  isServerless: boolean;
}

export const reindexHandler = async ({
  credentialStore,
  dataClient,
  request,
  indexName,
  newIndexName,
  licensing,
  log,
  savedObjects,
  reindexOptions,
  security,
  version,
  rollupsEnabled,
  isServerless,
}: // accept index settings as params
ReindexHandlerArgs): Promise<ReindexOperation> => {
  const callAsCurrentUser = dataClient.asCurrentUser;
  const reindexActions = reindexActionsFactory(
    savedObjects,
    callAsCurrentUser,
    log,
    getRollupJobByIndexName,
    rollupsEnabled
  );
  const reindexService = reindexServiceFactory(
    callAsCurrentUser,
    reindexActions,
    log,
    licensing,
    version,
    isServerless
  );

  if (!(await reindexService.hasRequiredPrivileges([indexName, newIndexName]))) {
    throw error.accessForbidden(
      i18n.translate('xpack.reindexService.indexPrivilegesErrorBatch', {
        defaultMessage:
          'You do not have adequate privileges to reindex "{indexName}" to "{newIndexName}".',
        values: { indexName, newIndexName },
      })
    );
  }

  const existingOp = await reindexService.findReindexOperation(indexName);

  // If the reindexOp already exists and it's paused, resume it. Otherwise create a new one.
  const reindexOp =
    existingOp && existingOp.attributes.status === ReindexStatus.paused
      ? await reindexService.resumeReindexOperation(indexName, reindexOptions)
      : await reindexService.createReindexOperation({
          indexName,
          newIndexName,
          opts: reindexOptions,
        });

  // Add users credentials for the worker to use
  await credentialStore.set({ reindexOp, request, security });

  return reindexOp.attributes;
};
