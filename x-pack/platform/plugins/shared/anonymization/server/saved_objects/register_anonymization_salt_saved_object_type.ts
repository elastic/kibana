/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { ANONYMIZATION_SALT_SAVED_OBJECT_TYPE } from '../salt';

const anonymizationSaltSchemaV1 = schema.object({
  salt: schema.string(),
  replacementsEncryptionKey: schema.maybe(schema.string()),
});

export const registerAnonymizationSaltSavedObjectType = (
  core: CoreSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): void => {
  core.savedObjects.registerType({
    name: ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {},
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: anonymizationSaltSchemaV1.extends({}, { unknowns: 'ignore' }),
          create: anonymizationSaltSchemaV1,
        },
      },
    },
  });

  encryptedSavedObjects.registerType({
    type: ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['salt', 'replacementsEncryptionKey']),
  });
};
