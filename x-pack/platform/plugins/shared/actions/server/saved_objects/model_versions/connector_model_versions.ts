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
} from '../schemas/raw_connector';
import { actionEncryptedRegistrationV2, actionEncryptedRegistrationV3 } from '../action_encryption';

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
});
