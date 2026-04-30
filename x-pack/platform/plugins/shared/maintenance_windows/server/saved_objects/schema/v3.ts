/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { alertsFilterQuerySchema } from './v1';
import { rawMaintenanceWindowSchema as rawMaintenanceWindowSchemaV2 } from './v2';

export const rawMaintenanceWindowSchema = rawMaintenanceWindowSchemaV2.extends({
  scope: schema.maybe(
    schema.object({
      alerting: schema.maybe(schema.nullable(alertsFilterQuerySchema)),
      episodes: schema.maybe(schema.nullable(alertsFilterQuerySchema)),
    })
  ),
});
