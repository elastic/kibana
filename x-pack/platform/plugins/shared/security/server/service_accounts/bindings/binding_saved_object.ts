/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { schema } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { ServiceAccountWorkloadAttacher } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

export const SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE = 'service-account-workload-binding';

export interface WorkloadBindingCoordinates {
  operationType: string;
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
  operationType,
  workloadType,
  workloadId,
  spaceId,
}: WorkloadBindingCoordinates): string =>
  createHash('sha256')
    .update(JSON.stringify([operationType, workloadType, spaceId, workloadId]))
    .digest('hex');

export interface WorkloadBindingAttributes {
  operationType: string;
  workloadType: string;
  workloadId: string;
  serviceAccountId: string;
  spaceId: string;
  attachedBy: ServiceAccountWorkloadAttacher;
  /**
   * ISO-8601 timestamp, indexed as a `date`. Deliberately a string rather than a `Date`: this is
   * authenticated data, and it must be written in exactly the form it is read back in — a `Date`
   * would survive the round trip only as its serialized string anyway.
   */
  attachedAt: string;
  /**
   * Cryptographically random value, encrypted, never read for its content. Its authentication tag
   * is what makes every other attribute tamper-evident: they are all authenticated data, so a
   * direct-to-index edit of, say, `serviceAccountId` makes this attribute undecryptable and the
   * binding unusable.
   */
  canary: string;
}

const attacherSchemaV1 = schema.oneOf([
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
  operationType: schema.string(),
  workloadType: schema.string(),
  workloadId: schema.string(),
  serviceAccountId: schema.string(),
  spaceId: schema.string(),
  attachedBy: attacherSchemaV1,
  attachedAt: schema.string(),
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
    // Service accounts are project-scoped rather than space-scoped, and bindings are managed
    // globally: listing every workload bound to a service account must not require a per-space
    // sweep. The workload's own space is an authenticated attribute instead of the document's
    // namespace.
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        // Answers "which workloads run as this service account?".
        serviceAccountId: { type: 'keyword' },
        // These documents are namespace-agnostic, so they outlive the space their workload lived
        // in. Mapped ahead of the cleanup that will need it, since adding it later would cost a
        // model version.
        spaceId: { type: 'keyword' },
        // Mapped now so bindings can later be reported on by age without a migration.
        attachedAt: { type: 'date' },
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
  // but which service account a workload runs as must not be rewritable by anything holding
  // index-level access. Everything meaningful is therefore authenticated (AAD) and stays
  // queryable, while the encrypted canary makes tampering fail closed at credential mint.
  encryptedSavedObjects.registerType({
    type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
    enforceRandomId: false,
    attributesToEncrypt: new Set(['canary']),
    attributesToIncludeInAAD: new Set([
      'operationType',
      'workloadType',
      'workloadId',
      'serviceAccountId',
      'spaceId',
      'attachedBy',
      'attachedAt',
    ]),
  });
};
