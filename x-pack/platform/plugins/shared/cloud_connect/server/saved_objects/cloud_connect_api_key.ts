/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { CLOUD_CONNECT_API_KEY_TYPE } from '../../common/constants';

const cloudConnectApiKeySchema = schema.object({
  apiKey: schema.string(),
  clusterId: schema.maybe(schema.string()),
  createdAt: schema.maybe(schema.string()),
  updatedAt: schema.maybe(schema.string()),
});

export const CloudConnectApiKeyType: SavedObjectsType = {
  name: CLOUD_CONNECT_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: {
        type: 'binary',
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
    importableAndExportable: false,
    displayName: 'Cloud Connect API Key',
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: cloudConnectApiKeySchema.extends({}, { unknowns: 'ignore' }),
        create: cloudConnectApiKeySchema,
      },
    },
  },
};

export const CloudConnectApiKeyEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: CLOUD_CONNECT_API_KEY_TYPE,
  attributesToEncrypt: new Set(['apiKey']),
  attributesToIncludeInAAD: new Set(['clusterId']),
};
