/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rRuleRequestSchemaV1 } from '../../../r_rule';
import { validateSnoozeScheduleV1 } from '../../validation';

export const ruleSnoozeScheduleSchema = schema.object(
  {
    id: schema.maybe(
      schema.string({
        validate: (id: string) => {
          const regex = new RegExp('^[a-z0-9_-]+$', 'g');

          if (!regex.test(id)) {
            return `Key must be lower case, a-z, 0-9, '_', and '-' are allowed`;
          }
        },
      })
    ),
    duration: schema.number(),
    rRule: rRuleRequestSchemaV1,
  },
  { validate: validateSnoozeScheduleV1 }
);
