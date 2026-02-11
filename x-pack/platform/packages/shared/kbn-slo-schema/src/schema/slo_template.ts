/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  budgetingMethodSchema,
  dashboardsWithIdSchema,
  objectiveSchema,
  optionalSettingsSchema,
  tagsSchema,
} from './slo';
import { timeWindowSchema } from './time_window';
import { indicatorSchema } from './indicators';

const sloTemplateSchema = t.intersection([
  t.type({
    templateId: t.string,
  }),
  t.partial({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    timeWindow: timeWindowSchema,
    tags: tagsSchema,
    settings: optionalSettingsSchema,
    groupBy: t.array(t.string),
    artifacts: dashboardsWithIdSchema,
  }),
]);

// We really can't control what the integration are pushing into the saved object...
const storedSloTemplateSchema = t.record(t.string, t.unknown);

export { sloTemplateSchema, storedSloTemplateSchema };
