/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const CloudOnboardingDeploymentSchemaV1 = schema.object({
  provider: schema.string(),
  connectionId: schema.string(),
  mechanisms: schema.arrayOf(schema.string(), { maxSize: 10 }),
  deploymentId: schema.maybe(schema.string()),
  deploymentName: schema.maybe(schema.string()),
  services: schema.arrayOf(schema.string(), { maxSize: 1000 }),
  status: schema.string(),
  statusMessage: schema.maybe(schema.string()),
  attemptCount: schema.number(),
  vars: schema.recordOf(schema.string(), schema.string()),
  serviceVars: schema.recordOf(schema.string(), schema.arrayOf(schema.any(), { maxSize: 100 })),
  secrets: schema.recordOf(schema.string(), schema.string()),
  packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});
