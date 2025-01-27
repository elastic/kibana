/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { PreconfiguredAgentPoliciesSchema, PreconfiguredPackagesSchema } from '../models';

export const PutPreconfigurationSchema = {
  body: schema.object({
    agentPolicies: schema.maybe(PreconfiguredAgentPoliciesSchema),
    packages: schema.maybe(PreconfiguredPackagesSchema),
  }),
};

export const PostResetOnePreconfiguredAgentPoliciesSchema = {
  params: schema.object({
    agentPolicyId: schema.string(),
  }),
};
