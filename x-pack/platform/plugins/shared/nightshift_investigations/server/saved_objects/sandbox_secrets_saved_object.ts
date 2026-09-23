/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { MAX_SANDBOX_SECRETS, MAX_SANDBOX_SECRET_KEY_LENGTH } from '../../common/sandbox_secrets';

export const NIGHTSHIFT_SECRETS_SO_TYPE = 'nightshift-secrets';

export interface NightshiftSecretsAttributes {
  keys: string[];
  values: Record<string, string>;
}

const nightshiftSecretsAttributesSchemaV1 = schema.object({
  keys: schema.arrayOf(schema.string({ maxLength: MAX_SANDBOX_SECRET_KEY_LENGTH }), {
    maxSize: MAX_SANDBOX_SECRETS,
  }),
  // Encrypted attributes are stored as a string; the decrypted form is a key/value record.
  values: schema.string(),
});

export const nightshiftSecretsSavedObjectType: SavedObjectsType<NightshiftSecretsAttributes> = {
  name: NIGHTSHIFT_SECRETS_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: nightshiftSecretsAttributesSchemaV1,
        forwardCompatibility: nightshiftSecretsAttributesSchemaV1.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
  },
};

// `keys` stays out of AAD: it changes on every edit and only mirrors the encrypted record's keys.
export const nightshiftSecretsEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: NIGHTSHIFT_SECRETS_SO_TYPE,
  attributesToEncrypt: new Set(['values']),
};
