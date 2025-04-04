/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { typesRulesSchema } from '../../external/schemas/v1';

export const getRuleTypesInternalResponseBodySchema = schema.arrayOf(
  typesRulesSchema.extends({
    solution: schema.oneOf(
      [schema.literal('stack'), schema.literal('observability'), schema.literal('security')],
      {
        meta: {
          description: 'An identifier for the solution that owns this rule type.',
        },
      }
    ),
  })
);

export const getRuleTypesInternalResponseSchema = schema.object({
  body: getRuleTypesInternalResponseBodySchema,
});
