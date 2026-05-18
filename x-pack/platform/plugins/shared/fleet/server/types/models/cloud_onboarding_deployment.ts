/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const CloudOnboardingDeploymentSchemaV1 = schema.object({
  provider: schema.oneOf([schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')]),
  connectorId: schema.string(),
  mechanisms: schema.arrayOf(
    schema.oneOf([
      schema.literal('identity_federation'),
      schema.literal('firehose'),
      schema.literal('cloud_forwarder'),
    ]),
    { maxSize: 10 }
  ),
  deploymentId: schema.maybe(schema.string()),
  deploymentName: schema.maybe(schema.string()),
  services: schema.arrayOf(schema.string(), { maxSize: 1000 }),
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
  attemptCount: schema.maybe(schema.number({ min: 1 })),
  vars: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  serviceVars: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.arrayOf(schema.recordOf(schema.string(), schema.any()), { maxSize: 100 })
    )
  ),
  // ESO encrypts this field before model-version schema validation runs, so
  // the persisted value is an opaque encrypted blob rather than the original
  // Record<string,string> shape. schema.any() is required here.
  secrets: schema.maybe(schema.any()),
  packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
});
