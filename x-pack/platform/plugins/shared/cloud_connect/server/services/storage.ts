/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { CLOUD_CONNECT_API_KEY_TYPE, CLOUD_CONNECT_API_KEY_ID } from '../../common/constants';
import type { CloudConnectApiKey } from '../types';

export interface StorageServiceDependencies {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

/**
 * Service for managing encrypted Cloud Connect API key storage
 */
export class StorageService {
  private encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  private savedObjectsClient: SavedObjectsClientContract;
  private logger: Logger;

  constructor(dependencies: StorageServiceDependencies) {
    this.encryptedSavedObjectsClient = dependencies.encryptedSavedObjectsClient;
    this.savedObjectsClient = dependencies.savedObjectsClient;
    this.logger = dependencies.logger;
  }

  /**
   * Saves (or updates) the Cloud Connect API key
   * @param apiKey - The API key to store (will be encrypted)
   * @param clusterId - The cluster ID associated with this API key
   */
  async saveApiKey(apiKey: string, clusterId: string): Promise<void> {
    try {
      this.logger.debug('Saving Cloud Connect API key');

      const now = new Date().toISOString();
      const apiKeyData: CloudConnectApiKey = {
        apiKey,
        clusterId,
        createdAt: now,
        updatedAt: now,
      };

      await this.savedObjectsClient.create(CLOUD_CONNECT_API_KEY_TYPE, apiKeyData, {
        id: CLOUD_CONNECT_API_KEY_ID,
        overwrite: true, // Replace if exists
      });

      this.logger.debug(`Cloud Connect API key saved successfully for cluster: ${clusterId}`);
    } catch (error) {
      this.logger.error('Failed to save Cloud Connect API key', { error });
      throw error;
    }
  }

  /**
   * Retrieves and decrypts the stored Cloud Connect API key
   * @returns The stored API key data, or undefined if not found
   */
  async getApiKey(): Promise<CloudConnectApiKey | undefined> {
    try {
      this.logger.debug('Retrieving Cloud Connect API key');

      const result =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<CloudConnectApiKey>(
          CLOUD_CONNECT_API_KEY_TYPE,
          CLOUD_CONNECT_API_KEY_ID
        );

      this.logger.debug('Cloud Connect API key retrieved successfully');
      return result.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        this.logger.debug('Cloud Connect API key not found');
        return undefined;
      }

      this.logger.error('Failed to retrieve Cloud Connect API key', { error });
      throw error;
    }
  }

  /**
   * Deletes the stored Cloud Connect API key
   */
  async deleteApiKey(): Promise<void> {
    try {
      this.logger.debug('Deleting Cloud Connect API key');

      await this.savedObjectsClient.delete(CLOUD_CONNECT_API_KEY_TYPE, CLOUD_CONNECT_API_KEY_ID);

      this.logger.debug('Cloud Connect API key deleted successfully');
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        this.logger.debug('Cloud Connect API key not found (already deleted or never existed)');
        return;
      }

      this.logger.error('Failed to delete Cloud Connect API key', { error });
      throw error;
    }
  }
}
