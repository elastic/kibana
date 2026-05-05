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
 * Custom error thrown when the API key is not found in the saved object
 */
export class ApiKeyNotFoundError extends Error {
  public readonly statusCode = 503;

  constructor() {
    super('Failed to retrieve API key from saved object');
    this.name = 'ApiKeyNotFoundError';
  }
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

/**
 * Helper function to get API key data from storage, throwing if not found
 */
export async function getApiKeyData(
  context: RequestHandlerContext,
  getStartServices: StartServicesAccessor<CloudConnectedStartDeps, unknown>,
  logger: Logger
): Promise<{
  apiKeyData: { apiKey: string; clusterId: string };
  storageService: StorageService;
}> {
  const storageService = await createStorageService(context, getStartServices, logger);
  const apiKeyData = await storageService.getApiKey();

  if (!apiKeyData) {
    logger.warn('No API key found in saved object');
    throw new ApiKeyNotFoundError();
  }

  return { apiKeyData, storageService };
}
