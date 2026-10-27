/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const ProvisioningCallbackStatusSchema = schema.oneOf([
  schema.literal('pending'),
  schema.literal('receiving'),
  schema.literal('received'),
  schema.literal('cancelled'),
]);

const AccountTypeSchema = schema.oneOf([
  schema.literal('single-account'),
  schema.literal('organization-account'),
]);

/**
 * Stored shape of a `fleet-provisioning-callback`. Only the API key id is kept so the key can be
 * invalidated and matched against the caller; the key itself is never stored. The identity
 * fields are set at launch and copied to the cloud connector the report creates.
 */
export const ProvisioningCallbackSchemaV1 = schema.object({
  provider: schema.literal('aws'),
  status: ProvisioningCallbackStatusSchema,
  token_hash: schema.string({ minLength: 64, maxLength: 64 }),
  created_at: schema.string({ maxLength: 64 }),
  created_by: schema.maybe(schema.string({ maxLength: 1024 })),
  space_id: schema.maybe(schema.string({ maxLength: 1024 })),
  expires_at: schema.string({ maxLength: 64 }),
  received_at: schema.maybe(schema.string({ maxLength: 64 })),
  role_arn: schema.maybe(schema.string({ maxLength: 2048 })),
  stack_arn: schema.maybe(schema.string({ maxLength: 2048 })),
  connector_name: schema.maybe(schema.string({ maxLength: 255 })),
  account_type: schema.maybe(AccountTypeSchema),
  iac_key: schema.maybe(schema.nullable(schema.string({ maxLength: 2048 }))),
  iac_blueprint_id: schema.maybe(schema.nullable(schema.string({ maxLength: 256 }))),
  iac_blueprint_version: schema.maybe(schema.nullable(schema.string({ maxLength: 128 }))),
  cloud_connector_id: schema.maybe(schema.string({ maxLength: 256 })),
  onboarding_deployment_id: schema.maybe(schema.string({ maxLength: 256 })),
  deploy_status: schema.maybe(
    schema.oneOf([
      schema.literal('pending'),
      schema.literal('deploying'),
      schema.literal('deployed'),
      schema.literal('failed'),
    ])
  ),
  deploy_error: schema.maybe(schema.string({ maxLength: 4096 })),
});
