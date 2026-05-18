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

export const deleteRuleRequestQuerySchema = schema.object({
  invalidate_api_key_now: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'When `true`, the rule API keys are invalidated synchronously as part of the delete request, instead of being queued for invalidation by the background task (which only processes entries older than `xpack.alerting.invalidateApiKeysTask.removalDelay`, default `1h`). The caller must already have privileges to delete the rule.',
      },
    })
  ),
});
