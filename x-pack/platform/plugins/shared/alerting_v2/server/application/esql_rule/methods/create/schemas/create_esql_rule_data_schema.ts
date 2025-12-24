/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDuration } from '../../../../../lib/duration';

export const createEsqlRuleDataSchema = schema.object(
  {
    name: schema.string({ minLength: 1 }),
    tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
    schedule: schema.string({ validate: validateDuration }),
    enabled: schema.boolean({ defaultValue: true }),
    esql: schema.string({ minLength: 1 }),
    timeField: schema.string({ minLength: 1 }),
    lookbackWindow: schema.string({ validate: validateDuration }),
    groupKey: schema.arrayOf(schema.string(), { defaultValue: [] }),
  },
  { unknowns: 'allow' }
);
