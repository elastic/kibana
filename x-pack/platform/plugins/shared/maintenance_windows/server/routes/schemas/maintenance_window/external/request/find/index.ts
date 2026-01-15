/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  findMaintenanceWindowsQuerySchema,
  findMaintenanceWindowsResponseSchema,
} from './schemas/latest';

export type { FindMaintenanceWindowsQuery, FindMaintenanceWindowsResponse } from './types/latest';

export {
  findMaintenanceWindowsQuerySchema as findMaintenanceWindowsQuerySchemaV1,
  findMaintenanceWindowsResponseSchema as findMaintenanceWindowsResponseSchemaV1,
} from './schemas/v1';

export type {
  FindMaintenanceWindowsQuery as FindMaintenanceWindowsQueryV1,
  FindMaintenanceWindowsResponse as FindMaintenanceWindowsResponseV1,
} from './types/v1';
