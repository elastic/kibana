/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV17 } from './v17';

const verdictSchema = schema.oneOf([
  schema.literal('true_positive'),
  schema.literal('false_positive'),
  schema.literal('benign_positive'),
  schema.literal('suspicious'),
  schema.literal('undetermined'),
]);

export const casesSchema = casesSchemaV17.extends({
  ai_verdict: schema.maybe(
    schema.nullable(
      schema.object({
        verdict: verdictSchema,
        confidence: schema.maybe(schema.nullable(schema.number({ min: 0, max: 1 }))),
        summary: schema.maybe(schema.nullable(schema.string())),
        actor: schema.maybe(
          schema.nullable(
            schema.object({
              type: schema.string(),
              id: schema.maybe(schema.nullable(schema.string())),
              name: schema.maybe(schema.nullable(schema.string())),
              run_id: schema.maybe(schema.nullable(schema.string())),
            })
          )
        ),
        updated_at: schema.maybe(schema.nullable(schema.string())),
      })
    )
  ),
  pending_decisions: schema.maybe(schema.nullable(schema.number({ min: 0 }))),
});
