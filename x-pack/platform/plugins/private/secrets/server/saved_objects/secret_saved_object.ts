/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { SECRET_DESCRIPTION_MAX_LENGTH, SECRET_NAME_MAX_LENGTH } from '@kbn/secrets';

export const SECRET_SAVED_OBJECT_TYPE = 'secret';

const USERNAME_MAX_LENGTH = 1024;
const TIMESTAMP_MAX_LENGTH = 64;
// The schema sees the stored value: the ciphertext of a value of at most SECRET_VALUE_MAX_LENGTH
// characters.
const ENCRYPTED_VALUE_MAX_LENGTH = 131072;

const secretSchemaV1 = schema.object({
  name: schema.string({ minLength: 1, maxLength: SECRET_NAME_MAX_LENGTH }),
  description: schema.maybe(schema.string({ maxLength: SECRET_DESCRIPTION_MAX_LENGTH })),
  createdBy: schema.nullable(schema.string({ maxLength: USERNAME_MAX_LENGTH })),
  createdAt: schema.string({ maxLength: TIMESTAMP_MAX_LENGTH }),
  updatedBy: schema.nullable(schema.string({ maxLength: USERNAME_MAX_LENGTH })),
  updatedAt: schema.string({ maxLength: TIMESTAMP_MAX_LENGTH }),
  value: schema.string({ minLength: 1, maxLength: ENCRYPTED_VALUE_MAX_LENGTH }),
});

/** One named secret of one space, as stored and as returned by a read that decrypts. */
export type SecretAttributes = TypeOf<typeof secretSchemaV1>;

/** What a read that does not decrypt returns: Kibana strips the encrypted `value`. */
export type ListedSecretAttributes = Omit<SecretAttributes, 'value'>;

const ATTRIBUTES_TO_ENCRYPT = ['value'] as const;
// Only the name: it never changes. A secret is always written whole, never partially updated.
const ATTRIBUTES_INCLUDED_IN_AAD = ['name'] as const;

/** Fixed namespace for the secret id, so one name in one space always gets the same id. */
const SECRET_ID_NAMESPACE = '5f0c1c7e-8a3d-4b52-9e7a-2c6d4f1b9a30';

/**
 * Encrypted saved objects accept only UUID ids, so the id is a UUIDv5 of the space and the name.
 * This makes a name unique in its space, as a storage guarantee.
 */
export const getSecretSavedObjectId = ({
  spaceId,
  name,
}: {
  spaceId: string;
  name: string;
}): string => uuidv5(`${spaceId}:${name}`, SECRET_ID_NAMESPACE);

/** Registers the secret type with Core and its `value` with encrypted saved objects. */
export const registerSecretType = ({
  savedObjects,
  encryptedSavedObjects,
}: {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}): void => {
  savedObjects.registerType({
    name: SECRET_SAVED_OBJECT_TYPE,
    hidden: true,
    // Isolated per space today. `multiple-isolated` lets a later version share a secret between
    // spaces by switching to `multiple`, without migrating data.
    namespaceType: 'multiple-isolated',
    // Nothing searches on an attribute: a secret is read by its id, and lists read the whole space.
    mappings: {
      dynamic: false,
      properties: {},
    },
    // A secret never leaves its Kibana: it does not export or import.
    management: { importableAndExportable: false },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: secretSchemaV1.extends({}, { unknowns: 'ignore' }),
          create: secretSchemaV1,
        },
      },
    },
  });

  encryptedSavedObjects.registerType({
    type: SECRET_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(ATTRIBUTES_TO_ENCRYPT),
    attributesToIncludeInAAD: new Set(ATTRIBUTES_INCLUDED_IN_AAD),
  });
};
