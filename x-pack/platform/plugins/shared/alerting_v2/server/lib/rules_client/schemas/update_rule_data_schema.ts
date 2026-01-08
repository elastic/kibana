/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDuration } from '../../duration';
import { validateEsqlQuery } from '../validators';

export const updateRuleDataSchema = schema.object(
  {
    name: schema.maybe(schema.string({ minLength: 1 })),
    tags: schema.maybe(schema.arrayOf(schema.string(), { defaultValue: [] })),
    schedule: schema.maybe(
      schema.object({
        custom: schema.string({ validate: validateDuration }),
      })
    ),
    enabled: schema.maybe(schema.boolean()),
    query: schema.maybe(schema.string({ minLength: 1, validate: validateEsqlQuery })),
    timeField: schema.maybe(schema.string({ minLength: 1 })),
    lookbackWindow: schema.maybe(schema.string({ validate: validateDuration })),
    groupingKey: schema.maybe(schema.arrayOf(schema.string(), { defaultValue: [] })),
  },
  { unknowns: 'ignore' }
);
