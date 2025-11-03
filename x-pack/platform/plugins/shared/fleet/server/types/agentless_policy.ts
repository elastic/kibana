/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SimplifiedCreatePackagePolicyRequestBodySchema } from './models';

export const CreateAgentlessPolicyRequestSchema = {
  query: schema.object({}),
  body: SimplifiedCreatePackagePolicyRequestBodySchema.extends({
    // Remove all properties that are not relevant for agentless policies
    policy_id: undefined,
    policy_ids: undefined,
    supports_agentless: undefined,
    output_id: undefined,
  }),
};
