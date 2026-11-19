/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { Type, TypeOf } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  normalizeSecretName,
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_NAME_MAX_LENGTH,
  SECRET_PROVIDER_TYPE,
  SECRET_REFERENCE_MAX_LENGTH,
} from '@kbn/secrets';
import type { SecretProviderType } from '@kbn/secrets';

export const SECRET_SAVED_OBJECT_TYPE = 'secret';

const ID_MAX_LENGTH = 255;
const USERNAME_MAX_LENGTH = 1024;
const TIMESTAMP_MAX_LENGTH = 64;
const ALLOWED_CONSUMERS_MAX_SIZE = 100;
// The schema sees the stored value: the ciphertext of a value of at most SECRET_VALUE_MAX_LENGTH characters.
const ENCRYPTED_VALUE_MAX_LENGTH = 131072;

// Each field is defined once here. The types and the stored schema are both built from these.
const baseFields = {
  name: schema.string({ minLength: 1, maxLength: SECRET_NAME_MAX_LENGTH }),
  description: schema.maybe(schema.string({ maxLength: SECRET_DESCRIPTION_MAX_LENGTH })),
  allowedConsumers: schema.arrayOf(schema.string({ minLength: 1, maxLength: ID_MAX_LENGTH }), {
    minSize: 1,
    maxSize: ALLOWED_CONSUMERS_MAX_SIZE,
  }),
  createdBy: schema.string({ maxLength: USERNAME_MAX_LENGTH }),
  createdAt: schema.string({ maxLength: TIMESTAMP_MAX_LENGTH }),
  updatedBy: schema.string({ maxLength: USERNAME_MAX_LENGTH }),
  updatedAt: schema.string({ maxLength: TIMESTAMP_MAX_LENGTH }),
};
const valueField = schema.string({ minLength: 1, maxLength: ENCRYPTED_VALUE_MAX_LENGTH });
const connectorIdField = schema.string({ minLength: 1, maxLength: ID_MAX_LENGTH });
const referenceField = schema.string({ minLength: 1, maxLength: SECRET_REFERENCE_MAX_LENGTH });

const kibanaSecretSchema = schema.object({
  ...baseFields,
  provider: schema.literal(SECRET_PROVIDER_TYPE.kibana),
  value: valueField,
});

const connectorSecretSchema = schema.object({
  ...baseFields,
  provider: schema.literal(SECRET_PROVIDER_TYPE.connector),
  connectorId: connectorIdField,
  reference: referenceField,
});

/** A secret stored in Kibana. `value` is encrypted. */
export type KibanaSecretAttributes = TypeOf<typeof kibanaSecretSchema>;

/** A secret fetched through a connector. It stores where the value is, never the value. */
export type ConnectorSecretAttributes = TypeOf<typeof connectorSecretSchema>;

/** One named secret of one space, as stored and as returned by a read that decrypts. */
export type SecretAttributes = KibanaSecretAttributes | ConnectorSecretAttributes;

/** What a read that does not decrypt returns: Kibana strips the encrypted `value`. */
export type ListedSecretAttributes =
  | Omit<KibanaSecretAttributes, 'value'>
  | ConnectorSecretAttributes;

/** Makes a field required for one provider and forbidden for the other. */
const onlyForProvider = (provider: SecretProviderType, field: Type<string>) =>
  schema.conditional(schema.siblingRef('provider'), provider, field, schema.never());

// A saved object schema must be one object, so it cannot be the union of the two schemas
// above. It states the same rule with fields that depend on the provider.
const secretSchemaV1 = schema.object({
  ...baseFields,
  provider: schema.oneOf([
    schema.literal(SECRET_PROVIDER_TYPE.kibana),
    schema.literal(SECRET_PROVIDER_TYPE.connector),
  ]),
  value: onlyForProvider(SECRET_PROVIDER_TYPE.kibana, valueField),
  connectorId: onlyForProvider(SECRET_PROVIDER_TYPE.connector, connectorIdField),
  reference: onlyForProvider(SECRET_PROVIDER_TYPE.connector, referenceField),
});

const ATTRIBUTES_TO_ENCRYPT = ['value'] as const;
// Only the name: it never changes. A secret is always written whole, never partially updated.
const ATTRIBUTES_INCLUDED_IN_AAD = ['name'] as const;

/** Fixed namespace for the secret id, so one name in one space always gets the same id. */
const SECRET_ID_NAMESPACE = '5f0c1c7e-8a3d-4b52-9e7a-2c6d4f1b9a30';

/**
 * ESO accepts only UUID ids for encrypted types, so the id is a UUIDv5 of the space and the
 * name. This makes a name unique in its space, regardless of case, as a storage guarantee.
 */
export const getSecretSavedObjectId = ({
  spaceId,
  name,
}: {
  spaceId: string;
  name: string;
}): string => uuidv5(`${spaceId}:${normalizeSecretName(name)}`, SECRET_ID_NAMESPACE);

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
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {
        name: { type: 'keyword' },
      },
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
