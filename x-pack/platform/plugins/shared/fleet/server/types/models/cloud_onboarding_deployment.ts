/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// ── Shared schema primitives reused across V1 and V2 ─────────────────────────

const ProviderSchema = schema.oneOf([
  schema.literal('aws'),
  schema.literal('azure'),
  schema.literal('gcp'),
]);

const MechanismSchema = schema.oneOf([
  schema.literal('managed_integration'),
  schema.literal('ecf'),
  schema.literal('agent_based'),
]);

const StatusSchema = schema.oneOf(
  [
    schema.literal('pending'),
    schema.literal('deploying'),
    schema.literal('succeeded'),
    schema.literal('failed'),
  ],
  { defaultValue: 'pending' }
);

const DataFormatSchema = schema.oneOf([schema.literal('ecs'), schema.literal('otel')]);

const EcfStackSchema = schema.object({
  family: schema.oneOf([
    schema.literal('unified'),
    schema.literal('otel'),
    schema.literal('crowdstrike'),
  ]),
  /** CloudFormation stack name; bounded by the 128-char AWS limit. */
  stackName: schema.string({ minLength: 1, maxLength: 128 }),
  /** ECF semantic version resolved at launch time, e.g. "1.10.0". */
  templateVersion: schema.string({ minLength: 1, maxLength: 32 }),
});

const SharedFields = {
  deploymentId: schema.maybe(schema.string()),
  deploymentName: schema.maybe(schema.string()),
  services: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 1000 }),
  statusMessage: schema.maybe(schema.string()),
  attemptCount: schema.number({ min: 1, defaultValue: 1 }),
  serviceVars: schema.maybe(
    schema.recordOf(schema.string({ minLength: 1 }), schema.recordOf(schema.string(), schema.any()))
  ),
  globalRegion: schema.maybe(schema.string()),
  packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1000 })),
  apiKeyId: schema.maybe(schema.string()),
  ecfStacks: schema.maybe(schema.arrayOf(EcfStackSchema, { maxSize: 10 })),
};

// ── V2: widened authMethod enum + agentPolicyIds (array) ─────────────────────
// Replaces the singular agentPolicyId which the UI never wrote.
// No mapping change needed — neither field is in mappings.properties
// (dynamic: false, only connectorId is indexed).
export const CloudOnboardingDeploymentSchemaV2 = schema.object({
  provider: ProviderSchema,
  mechanisms: schema.arrayOf(MechanismSchema, { maxSize: 10 }),
  status: StatusSchema,
  dataFormat: schema.maybe(DataFormatSchema),
  // nullable: MI→ECF transition explicitly PUTs null to clear the connector association
  connectorId: schema.maybe(schema.nullable(schema.string({ minLength: 1 }))),
  authMethod: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.literal('identity_federation'),
        schema.literal('static_keys'),
        schema.literal('temporary_keys'),
        schema.literal('shared_credentials'),
        schema.literal('assume_role'),
      ])
    )
  ),
  agentPolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1000 })),
  policyIdsByInstance: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  ...SharedFields,
});

// ── V1 ───────────────────────────────────────────────────────────────────────
export const CloudOnboardingDeploymentSchemaV1 = schema.object({
  provider: ProviderSchema,
  mechanisms: schema.arrayOf(MechanismSchema, { maxSize: 10 }),
  status: StatusSchema,
  dataFormat: schema.maybe(DataFormatSchema),
  connectorId: schema.maybe(schema.string({ minLength: 1 })),
  authMethod: schema.maybe(
    schema.nullable(
      schema.oneOf([schema.literal('identity_federation'), schema.literal('static_keys')])
    )
  ),
  policyIdsByInstance: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  /** @deprecated Replaced by agentPolicyIds (array) in V2. Retained for forward-compat reads of V1 docs. */
  agentPolicyId: schema.maybe(schema.string()),
  ...SharedFields,
});
