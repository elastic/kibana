/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowSchema } from '../../../schemas';

export const bulkGetMaintenanceWindowsErrorSchema = schema.object({
  id: schema.string(),
  error: schema.string(),
  message: schema.string(),
  statusCode: schema.number(),
});

export const bulkGetMaintenanceWindowsResultSchema = schema.object({
  maintenanceWindows: schema.arrayOf(maintenanceWindowSchema),
  errors: schema.arrayOf(bulkGetMaintenanceWindowsErrorSchema),
});
