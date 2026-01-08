/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ILicense } from '@kbn/licensing-types';
import type { Subscription } from 'rxjs';
import { CLOUD_CONNECT_API_KEY_TYPE } from '../../common/constants';
import { CloudConnectClient } from '../services/cloud_connect_client';
import { StorageService } from '../services/storage';

export interface RegisterCloudConnectLicenseSyncOptions {
  savedObjects: CoreStart['savedObjects'];
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
  logger: Logger;
  cloudApiUrl: string;
}

/**
 * Subscribe to local license changes and report them to Cloud Connect.
 * Returns the RxJS subscription so callers can unsubscribe during plugin stop.
 */
export function registerCloudConnectLicenseSync({
  savedObjects,
  encryptedSavedObjects,
  licensing,
  logger,
  cloudApiUrl,
}: RegisterCloudConnectLicenseSyncOptions): Subscription {
  const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
  });
  const savedObjectsClient = new SavedObjectsClient(
    savedObjects.createInternalRepository([CLOUD_CONNECT_API_KEY_TYPE])
  );

  const storageService = new StorageService({
    encryptedSavedObjectsClient,
    savedObjectsClient,
    logger,
  });

  const cloudConnectClient = new CloudConnectClient(logger, cloudApiUrl);

  return licensing.license$.subscribe({
    next: async ({ type, uid }: Pick<ILicense, 'type' | 'uid'>) => {
      try {
        const apiKeyData = await storageService.getApiKey();
        if (!apiKeyData) {
          // Cluster isn't connected yet.
          return;
        }

        await cloudConnectClient.updateClusterLicense(apiKeyData.apiKey, apiKeyData.clusterId, {
          type: String(type),
          uid: String(uid),
        });
      } catch (error) {
        logger.warn('Failed to sync license to Cloud Connect', { error });
      }
    },
  });
}
