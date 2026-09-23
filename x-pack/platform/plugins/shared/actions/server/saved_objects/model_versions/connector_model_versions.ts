/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  rawConnectorSchemaV1,
  rawConnectorSchemaV2,
  rawConnectorSchemaV3,
  rawConnectorSchemaV4,
} from '../schemas/raw_connector';
import { actionEncryptedRegistrationV2, actionEncryptedRegistrationV3 } from '../action_encryption';

/** Empty string and null are not credentials. v3 encrypts `""`, so this must see the decrypted value. */
const storedIdentityPresent = (value: unknown): boolean =>
  typeof value === 'string' && value.length > 0;

export const connectorModelVersions = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectsModelVersionMap => ({
  '1': {
    changes: [],
    schemas: {
      create: rawConnectorSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'data_backfill',
        backfillFn: (doc) => {
          if (!doc.attributes.authMode) {
            return { ...doc, attributes: { ...doc.attributes, authMode: 'shared' } };
          }
          return doc;
        },
      },
    ],
    schemas: {
      create: rawConnectorSchemaV2,
      forwardCompatibility: rawConnectorSchemaV2.extends({}, { unknowns: 'ignore' }),
    },
  },
  '3': encryptedSavedObjects.createModelVersion({
    modelVersion: {
      changes: [
        {
          // no-op backfill to trigger decrypt/re-encrypt with the new encrypted attributes
          type: 'data_backfill',
          backfillFn: (doc) => doc,
        },
      ],
      schemas: {
        create: rawConnectorSchemaV3,
        forwardCompatibility: rawConnectorSchemaV3.extends({}, { unknowns: 'ignore' }),
      },
    },
    inputType: actionEncryptedRegistrationV2,
    outputType: actionEncryptedRegistrationV3,
    shouldTransformIfDecryptionFails: true,
  }),
  // Decrypt first. An empty apiKey is encrypted by v3, and the ciphertext is a non-empty string.
  '4': encryptedSavedObjects.createModelVersion({
    modelVersion: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            if (doc.attributes.hasInboundEventIdentity !== undefined) {
              return doc;
            }
            // Pre-v4 connectors stored identity only as encrypted apiKey / uiamApiKey.
            // Marking every document false would report inbound off while the credential still works.
            const hasInboundEventIdentity =
              storedIdentityPresent(doc.attributes.apiKey) ||
              storedIdentityPresent(doc.attributes.uiamApiKey);
            return {
              ...doc,
              attributes: { ...doc.attributes, hasInboundEventIdentity },
            };
          },
        },
      ],
      schemas: {
        create: rawConnectorSchemaV4,
        forwardCompatibility: rawConnectorSchemaV4.extends({}, { unknowns: 'ignore' }),
      },
    },
    inputType: actionEncryptedRegistrationV3,
    outputType: actionEncryptedRegistrationV3,
  }),
});
