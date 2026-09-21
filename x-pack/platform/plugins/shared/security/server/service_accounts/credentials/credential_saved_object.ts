/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { schema } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { ServiceAccountWorkloadBinder } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

export const SERVICE_ACCOUNT_CREDENTIAL_TYPE = 'service-account-credential';

/**
 * The principal that created the credential. Reuses the workload binder shape because both
 * answer the same question — which principal performed this action — and recording attribution
 * two different ways would make "everything this person set up" unanswerable.
 *
 * TODO(legrego, followup): Naming is hard, let's unify this type definition so we don't do this long term.
 */
export type ServiceAccountCredentialCreator = ServiceAccountWorkloadBinder;

/**
 * Derives the credential's saved object ID from the service account principal, to facilitate direct lookups.
 * The ID is also part of the encryption AAD, so a credential document cannot be moved to another account.
 */
export const getCredentialId = (serviceAccountId: string): string =>
  createHash('sha256')
    .update(JSON.stringify(['credential', serviceAccountId]))
    .digest('hex');

export interface ServiceAccountCredentialAttributes {
  /** The Elasticsearch principal, `{namespace}/{service}`. */
  serviceAccountId: string;
  namespace: string;
  name: string;
  /** Name of the Elasticsearch service account token this credential holds. */
  tokenName: string;
  /**
   * ISO-8601 timestamp, indexed as a `date`. Deliberately a string rather than a `Date`: this is
   * authenticated data and must be written in exactly the form it is read back in.
   */
  createdAt: string;
  createdBy: ServiceAccountCredentialCreator;
  /**
   * The long-lived Elasticsearch service account token, encrypted at rest. Never leaves the
   * security plugin: consumers are handed a short-lived token exchanged from it.
   */
  token: string;
}

/**
 * The attributes of a credential that describe it without revealing it. Read without decrypting,
 * so they are not integrity-verified: fine for display, never for an authorization decision.
 */
export type ServiceAccountCredentialMetadata = Pick<
  ServiceAccountCredentialAttributes,
  'createdAt' | 'createdBy'
>;

const creatorSchemaV1 = schema.oneOf([
  schema.object({
    type: schema.literal('user'),
    username: schema.string(),
    userProfileId: schema.maybe(schema.string()),
  }),
  schema.object({
    type: schema.literal('api_key'),
    apiKeyId: schema.string(),
    variant: schema.oneOf([schema.literal('stack'), schema.literal('uiam')]),
    userProfileId: schema.maybe(schema.string()),
  }),
  schema.object({
    type: schema.literal('service_account'),
    serviceAccountId: schema.string(),
  }),
]);

const credentialSchemaV1 = schema.object({
  serviceAccountId: schema.string(),
  namespace: schema.string(),
  name: schema.string(),
  tokenName: schema.string(),
  createdAt: schema.string(),
  createdBy: creatorSchemaV1,
  token: schema.string(),
});

/**
 * Registers the service account credential type. Called unconditionally, even when service
 * accounts are disabled: a type that appears and disappears with a feature flag leaves documents
 * unreadable on the deployments that once had it enabled.
 */
export const registerServiceAccountCredentialSavedObjectType = (
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): void => {
  savedObjects.registerType({
    name: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
    hidden: true,
    // Elasticsearch service accounts are cluster-scoped, so their credentials are too.
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        // Answers "does this account have a credential, and which document is it?" without
        // re-deriving the ID.
        serviceAccountId: { type: 'keyword', ignore_above: 1024 },
        // Mapped now so credentials can later be reported on by age without a migration.
        createdAt: { type: 'date' },
        // Reusing the binder shape is what keeps "everything this person set up" answerable
        // across credentials and workload bindings, so it has to be queryable here too. Explicit,
        // so that adding a fourth variant is a deliberate mapping decision rather than something
        // that starts indexing on its own, and mapped now because adding a mapping once
        // credentials exist costs a model version.
        createdBy: {
          dynamic: false,
          properties: {
            type: { type: 'keyword', ignore_above: 1024 },
            username: { type: 'keyword', ignore_above: 1024 },
            userProfileId: { type: 'keyword', ignore_above: 1024 },
            apiKeyId: { type: 'keyword', ignore_above: 1024 },
            variant: { type: 'keyword', ignore_above: 1024 },
            serviceAccountId: { type: 'keyword', ignore_above: 1024 },
          },
        },
        // `token` is deliberately unmapped: it is ciphertext, and nothing queries it.
      },
    },
    management: { importableAndExportable: false },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: credentialSchemaV1.extends({}, { unknowns: 'ignore' }),
          create: credentialSchemaV1,
        },
      },
    },
  });

  // Unlike the workload binding, this object holds a real secret, so encryption buys secrecy
  // first. Every other attribute is immutable and describes the token, which is exactly what
  // belongs in AAD; binding them also makes the document non-transplantable onto another account.
  encryptedSavedObjects.registerType({
    type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
    enforceRandomId: false,
    attributesToEncrypt: new Set(['token']),
    attributesToIncludeInAAD: new Set([
      'serviceAccountId',
      'namespace',
      'name',
      'tokenName',
      'createdAt',
      'createdBy',
    ]),
  });
};
