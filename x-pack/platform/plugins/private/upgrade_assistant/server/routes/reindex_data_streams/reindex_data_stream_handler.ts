/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';

import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';

import {
  DataStreamReindexOperation,
  DataStreamReindexSavedObject,
  ReindexStatus,
} from '../../../common/types';

import { CredentialStore } from '../../lib/reindexing/credential_store';
import { error } from '../../lib/reindexing/error';
import { dataStreamReindexActionsFactory } from '../../lib/reindexing/data_stream_actions';
import { dataStreamReindexServiceFactory } from '../../lib/reindexing/data_stream_reindex_service';

interface ReindexHandlerArgs {
  savedObjects: SavedObjectsClientContract;
  dataClient: IScopedClusterClient;
  indexName: string;
  log: Logger;
  licensing: LicensingPluginSetup;
  request: KibanaRequest;
  credentialStore: CredentialStore<DataStreamReindexSavedObject>;
  reindexOptions?: {
    enqueue?: boolean;
  };
  security?: SecurityPluginStart;
}

export const reindexDataStreamHandler = async ({
  credentialStore,
  dataClient,
  request,
  indexName,
  licensing,
  log,
  savedObjects,
  security,
}: ReindexHandlerArgs): Promise<DataStreamReindexOperation> => {
  const callAsCurrentUser = dataClient.asCurrentUser;
  const dataStreamReindexActions = dataStreamReindexActionsFactory(savedObjects, callAsCurrentUser);
  const reindexService = dataStreamReindexServiceFactory(
    callAsCurrentUser,
    dataStreamReindexActions,
    log,
    licensing
  );

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
      ? await reindexService.resumeReindexOperation(indexName)
      : await reindexService.createReindexOperation(indexName);

  // Add users credentials for the worker to use
  await credentialStore.set({ reindexOp, request, security });

  return reindexOp.attributes;
};
