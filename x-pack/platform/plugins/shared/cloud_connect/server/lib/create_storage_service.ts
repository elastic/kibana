/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, RequestHandlerContext, StartServicesAccessor } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { StorageService } from '../services/storage';
import { CLOUD_CONNECT_API_KEY_TYPE } from '../../common/constants';

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

/**
 * Helper function to create a StorageService instance with all required clients
 * @param context - The request handler context
 * @param getStartServices - Function to get start services
 * @param logger - Logger instance
 * @returns Initialized StorageService instance
 */
export async function createStorageService(
  context: RequestHandlerContext,
  getStartServices: StartServicesAccessor<CloudConnectedStartDeps, unknown>,
  logger: Logger
): Promise<StorageService> {
  const coreContext = await context.core;
  const [, { encryptedSavedObjects }] = await getStartServices();

  const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
  });

  const savedObjectsClient = coreContext.savedObjects.getClient({
    includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
  });

  return new StorageService({
    encryptedSavedObjectsClient,
    savedObjectsClient,
    logger,
  });
}
