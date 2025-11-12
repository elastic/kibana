/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { CLOUD_CONNECT_API_KEY_TYPE } from '../../common/constants';

/**
 * Saved object type definition for Cloud Connect API key storage
 */
export const CloudConnectApiKeyType: SavedObjectsType = {
  name: CLOUD_CONNECT_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'agnostic', // Space-agnostic - single key for entire instance
  mappings: {
    dynamic: false,
    properties: {
      apiKey: {
        type: 'binary', // Encrypted fields are stored as binary
      },
      clusterId: {
        type: 'keyword',
      },
      createdAt: {
        type: 'date',
      },
      updatedAt: {
        type: 'date',
      },
    },
  },
  management: {
    importableAndExportable: false, // Sensitive data should not be exported
    displayName: 'Cloud Connect API Key',
  },
};

/**
 * Encryption configuration for the Cloud Connect API key saved object
 */
export const CloudConnectApiKeyEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: CLOUD_CONNECT_API_KEY_TYPE,
  attributesToEncrypt: new Set(['apiKey']), // Only the API key is encrypted
  attributesToIncludeInAAD: new Set(['clusterId']), // Additional Authenticated Data
};
