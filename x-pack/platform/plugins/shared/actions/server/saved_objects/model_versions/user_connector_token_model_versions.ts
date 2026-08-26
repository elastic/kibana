/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  rawUserConnectorTokenSchemaV1,
  rawUserConnectorTokenSchemaV2,
} from '../schemas/raw_user_connector_token';

// `userCloudId` is added to AAD (see userConnectorTokenEncryptedRegistrationV2) but is not
// populated yet, so existing documents keep the same AAD and do not need re-encryption. Adding
// the field to the schema and mappings is a plain, additive change that does not require the
// `encryptedSavedObjects.createModelVersion` wrapper.
export const userConnectorTokenModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawUserConnectorTokenSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawUserConnectorTokenSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          userCloudId: { type: 'keyword', ignore_above: 1024 },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawUserConnectorTokenSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawUserConnectorTokenSchemaV2,
    },
  },
};
