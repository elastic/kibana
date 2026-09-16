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

export const SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE = 'service-account-workload-binding';

export interface WorkloadBindingCoordinates {
  pluginId: string;
  workloadType: string;
  workloadId: string;
  spaceId: string;
}

/**
 * Derives the binding's saved object ID from its coordinates, so a workload's binding can be
 * fetched directly rather than searched for. The ID is also part of the encryption AAD, so a
 * binding document cannot be transplanted onto different coordinates.
 *
 * SHA-256 over a JSON-encoded tuple: approved under FIPS 140-3, unlike the SHA-1 behind UUIDv5,
 * and unambiguous, so no set of coordinates can be made to collide with another by smuggling the
 * separator into one of them.
 */
export const getWorkloadBindingId = ({
  pluginId,
  workloadType,
  workloadId,
  spaceId,
}: WorkloadBindingCoordinates): string =>
  createHash('sha256')
    .update(JSON.stringify([pluginId, workloadType, spaceId, workloadId]))
    .digest('hex');

export interface WorkloadBindingAttributes {
  pluginId: string;
  workloadType: string;
  workloadId: string;
  serviceAccountId: string;
  spaceId: string;
  boundBy: ServiceAccountWorkloadBinder;
  /**
   * ISO-8601 timestamp, indexed as a `date`. Deliberately a string rather than a `Date`: this is
   * authenticated data, and it must be written in exactly the form it is read back in — a `Date`
   * would survive the round trip only as its serialized string anyway.
   */
  boundAt: string;
  /**
   * Cryptographically random value, encrypted, never read for its content. Its authentication tag
   * is what makes every other attribute tamper-evident: they are all authenticated data, so a
   * direct-to-index edit of, say, `serviceAccountId` makes this attribute undecryptable and the
   * binding unusable. Decryption skips an absent attribute rather than failing, so the reader
   * must also refuse a document whose canary is missing.
   *
   * Tamper-evidence is not freshness. A whole prior document restored under the same ID is
   * internally consistent and still decrypts, so an actor holding a copy can revive a binding
   * that was since changed or removed.
   */
  canary: string;
}

const binderSchemaV1 = schema.oneOf([
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

const workloadBindingSchemaV1 = schema.object({
  pluginId: schema.string(),
  workloadType: schema.string(),
  workloadId: schema.string(),
  serviceAccountId: schema.string(),
  spaceId: schema.string(),
  boundBy: binderSchemaV1,
  boundAt: schema.string(),
  canary: schema.string(),
});

/**
 * Registers the workload binding type. Called unconditionally, even when service accounts are
 * disabled: a type that appears and disappears with a feature flag leaves documents unreadable
 * on the deployments that once had it enabled.
 */
export const registerWorkloadBindingSavedObjectType = (
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): void => {
  savedObjects.registerType({
    name: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {
        // Answers "which workloads run as this service account?".
        serviceAccountId: { type: 'keyword', ignore_above: 1024 },
        // Mapped so bindings can later be reported on by age without a migration.
        boundAt: { type: 'date' },
        // The management UI groups a service account's workloads by plugin and labels them by
        // workload type, so both have to be filterable and aggregatable. Mapped now because
        // adding a mapping once bindings exist costs a model version.
        pluginId: { type: 'keyword', ignore_above: 1024 },
        workloadType: { type: 'keyword', ignore_above: 1024 },
        boundBy: {
          // Explicit, so that adding a fourth variant is a deliberate mapping decision rather
          // than something that starts indexing on its own.
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
      },
    },
    management: { importableAndExportable: false },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: workloadBindingSchemaV1.extends({}, { unknowns: 'ignore' }),
          create: workloadBindingSchemaV1,
        },
      },
    },
  });

  // Encryption here buys integrity, not secrecy: none of a binding's attributes are sensitive,
  // but which service account a workload runs as must not be rewritable to an account of the
  // editor's choosing by anything holding index-level access. Everything meaningful is therefore
  // authenticated (AAD) and stays queryable, while the encrypted canary makes tampering fail
  // closed at credential mint. Restoring a whole prior document is the residual case, and only
  // reaches accounts the workload was bound to before.
  encryptedSavedObjects.registerType({
    type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
    enforceRandomId: false,
    attributesToEncrypt: new Set(['canary']),
    attributesToIncludeInAAD: new Set([
      'pluginId',
      'workloadType',
      'workloadId',
      'serviceAccountId',
      'spaceId',
      'boundBy',
      'boundAt',
    ]),
  });
};
