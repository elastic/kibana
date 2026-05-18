/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const deleteRuleRequestParamsSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the rule.',
    },
  }),
});

/**
 * Query schema for the internal-only delete rule route. The `invalidate_api_key_now`
 * flag is an admin / test-cleanup escape hatch that bypasses the background
 * `xpack.alerting.invalidateApiKeysTask` queue and invalidates the rule's API keys
 * synchronously. Reserved for the internal route; not exposed on the public API.
 */
export const deleteRuleRequestQuerySchema = schema.object({
  invalidate_api_key_now: schema.maybe(schema.boolean()),
});
