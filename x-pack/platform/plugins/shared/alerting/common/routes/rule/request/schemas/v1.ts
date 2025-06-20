/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rRuleRequestSchemaV1 } from '../../../r_rule';
import { validateSnoozeScheduleV1 } from '../../validation';

export const MAX_ARTIFACTS_DASHBOARDS_LENGTH = 10;
export const MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH = 1000;

export const dashboardsSchema = schema.arrayOf(schema.object({ id: schema.string() }), {
  maxSize: MAX_ARTIFACTS_DASHBOARDS_LENGTH,
});

export const investigationGuideSchema = schema.object({
  blob: schema.string({
    maxLength: MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH, // with validation
  }),
});

export const artifactsSchema = schema.object({
  dashboards: schema.maybe(dashboardsSchema),
  investigation_guide: schema.maybe(investigationGuideSchema),
});

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
