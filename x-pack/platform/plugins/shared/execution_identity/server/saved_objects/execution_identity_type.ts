/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { EXECUTION_IDENTITY_SO_TYPE } from '../../common/types';

const executionIdentitySchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  role_descriptors: schema.string(),
  api_key_id: schema.string(),
  api_key: schema.string(),
  created_by: schema.string(),
  created_at: schema.string(),
});

export const ExecutionIdentitySavedObjectType: SavedObjectsType = {
  name: EXECUTION_IDENTITY_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      description: { type: 'text' },
      role_descriptors: { type: 'text' },
      api_key_id: { type: 'keyword' },
      created_by: { type: 'keyword' },
      created_at: { type: 'date' },
    },
  },
  management: {
    importableAndExportable: false,
    displayName: 'Execution Identity',
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: executionIdentitySchema.extends({}, { unknowns: 'ignore' }),
        create: executionIdentitySchema,
      },
    },
  },
};

export const ExecutionIdentityEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: EXECUTION_IDENTITY_SO_TYPE,
  attributesToEncrypt: new Set(['api_key']),
  attributesToIncludeInAAD: new Set(['name', 'api_key_id']),
};
