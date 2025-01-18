/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const disableRuleRequestBodySchema = schema.nullable(
  schema.maybe(
    schema.object({
      untrack: schema.maybe(
        schema.boolean({
          defaultValue: false,
          meta: {
            description: "Defines whether this rule's alerts should be untracked.",
          },
        })
      ),
    })
  )
);

export const disableRuleRequestParamsSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the rule.',
    },
  }),
});
