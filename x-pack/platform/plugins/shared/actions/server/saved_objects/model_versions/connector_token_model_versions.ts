/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  rawConnectorTokenSchemaV1,
  rawConnectorTokenSchemaV2,
} from '../schemas/raw_connector_token';
import { CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';

// ESO type registration for V1 (before refreshToken was added)
const connectorTokenTypeRegistrationV1 = {
  type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['token']),
  attributesToIncludeInAAD: new Set([
    'connectorId',
    'tokenType',
    'expiresAt',
    'createdAt',
    'updatedAt',
  ]),
};

// ESO type registration for V2 (with refreshToken and refreshTokenExpiresAt)
const connectorTokenTypeRegistrationV2 = {
  type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['token', 'refreshToken']),
  attributesToIncludeInAAD: new Set([
    'connectorId',
    'tokenType',
    'expiresAt',
    'createdAt',
    'updatedAt',
    'refreshTokenExpiresAt',
  ]),
};

export const getConnectorTokenModelVersions = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectsModelVersionMap => ({
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawConnectorTokenSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawConnectorTokenSchemaV1,
    },
  },
  '2': encryptedSavedObjects.createModelVersion({
    modelVersion: {
      changes: [
        {
          // no-op backfill to trigger the re-encryption
          type: 'data_backfill',
          backfillFn: (doc) => doc,
        },
      ],
      schemas: {
        forwardCompatibility: rawConnectorTokenSchemaV2.extends({}, { unknowns: 'ignore' }),
        create: rawConnectorTokenSchemaV2,
      },
    },
    inputType: connectorTokenTypeRegistrationV1,
    outputType: connectorTokenTypeRegistrationV2,
    shouldTransformIfDecryptionFails: true,
  }),
});
