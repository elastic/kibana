/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const CloudOnboardingDeploymentSchemaV1 = schema.object({
  provider: schema.oneOf([schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')]),
  connectorId: schema.string({ minLength: 1 }),
  mechanisms: schema.arrayOf(
    schema.oneOf([
      schema.literal('agentless'),
      schema.literal('firehose'),
      schema.literal('cloud_forwarder'),
      schema.literal('agent_based'),
    ]),
    { maxSize: 10 }
  ),
  deploymentId: schema.maybe(schema.string()),
  deploymentName: schema.maybe(schema.string()),
  services: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 1000 }),
  status: schema.oneOf(
    [
      schema.literal('pending'),
      schema.literal('deploying'),
      schema.literal('succeeded'),
      schema.literal('failed'),
    ],
    { defaultValue: 'pending' }
  ),
  statusMessage: schema.maybe(schema.string()),
  attemptCount: schema.number({ min: 1, defaultValue: 1 }),
  serviceVars: schema.maybe(
    schema.recordOf(
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.recordOf(schema.string(), schema.any()), { maxSize: 100 })
    )
  ),
  packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  agentPolicyId: schema.maybe(schema.string()),
  apiKeyId: schema.maybe(schema.string()),
});
