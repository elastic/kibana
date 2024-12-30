/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowCategoryIdsSchema } from '../../../schemas';
import { rRuleRequestSchema } from '../../../../r_rule/schemas';
import { alertsFilterQuerySchema } from '../../../../alerts_filter_query/schemas';

export const updateMaintenanceWindowParamsSchema = schema.object({
  id: schema.string(),
  data: schema.object({
    title: schema.maybe(schema.string()),
    enabled: schema.maybe(schema.boolean()),
    duration: schema.maybe(schema.number()),
    rRule: schema.maybe(rRuleRequestSchema),
    categoryIds: maintenanceWindowCategoryIdsSchema,
    scopedQuery: schema.maybe(schema.nullable(alertsFilterQuerySchema)),
  }),
});
