/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CATEGORY_IDS_MAX_SIZE,
  maintenanceWindowCategoryIdTypes as maintenanceWindowCategoryIdTypesV1,
} from '../constants/v1';
import { getAlertsFilterQuerySchemaV1 } from '../../../alerts_filter_query';
import { getRRuleRequestSchemaV1 } from '../../../r_rule';

/**
 * Request bounds applied only to the Maintenance Windows internal APIs. These
 * live here (not on the shared `alertsFilterQuerySchema` / `rRuleRequestSchema`)
 * so the public alerting rule APIs, which reuse those shared schemas, keep their
 * previous unbounded contract.
 */
export const maintenanceWindowScopedQuerySchema = getAlertsFilterQuerySchemaV1({
  maxKqlLength: 10000,
  maxFilters: 100,
  maxDslLength: 10000,
});

export const maintenanceWindowRRuleRequestSchema = getRRuleRequestSchemaV1({
  maxDtstartLength: 100,
  maxTzidLength: 64,
  maxUntilLength: 100,
  maxByweekdayLength: 10,
  maxByweekday: 50,
  maxBymonthday: 31,
  maxBymonth: 12,
});

export const maintenanceWindowCategoryIdsSchema = schema.maybe(
  schema.nullable(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(maintenanceWindowCategoryIdTypesV1.OBSERVABILITY),
        schema.literal(maintenanceWindowCategoryIdTypesV1.SECURITY_SOLUTION),
        schema.literal(maintenanceWindowCategoryIdTypesV1.MANAGEMENT),
      ]),
      {
        maxSize: CATEGORY_IDS_MAX_SIZE,
        meta: {
          description:
            'The category IDs for the maintenance window. It can be "observability", "securitySolution", or "management".',
        },
      }
    )
  )
);
