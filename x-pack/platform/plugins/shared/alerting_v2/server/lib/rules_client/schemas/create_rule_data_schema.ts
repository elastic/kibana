/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDuration } from '../../duration';
import { validateEsqlQuery } from '../validators';

export const createRuleDataSchema = schema.object(
  {
    name: schema.string({ minLength: 1, maxLength: 64 }),
    tags: schema.arrayOf(schema.string({ maxLength: 64 }), { defaultValue: [], maxSize: 100 }),
    schedule: schema.object({
      custom: schema.string({ validate: validateDuration }),
    }),
    enabled: schema.boolean({ defaultValue: true }),
    query: schema.string({ minLength: 1, maxLength: 10000, validate: validateEsqlQuery }),
    timeField: schema.string({ minLength: 1, maxLength: 128, defaultValue: '@timestamp' }),
    lookbackWindow: schema.string({ validate: validateDuration }),
    groupingKey: schema.arrayOf(schema.string(), { defaultValue: [], maxSize: 16 }),
  },
  { unknowns: 'ignore' }
);
