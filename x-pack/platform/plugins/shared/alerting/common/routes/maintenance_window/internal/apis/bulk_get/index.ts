/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { bulkGetBodySchema } from './schemas/latest';
export type {
  BulkGetMaintenanceWindowsRequestBody,
  BulkGetMaintenanceWindowsResponse,
  BulkGetMaintenanceWindowsResponseBody,
} from './types/latest';

export { bulkGetBodySchema as bulkGetBodySchemaV1 } from './schemas/v1';
export type {
  BulkGetMaintenanceWindowsRequestBody as BulkGetMaintenanceWindowsRequestBodyV1,
  BulkGetMaintenanceWindowsResponse as BulkGetMaintenanceWindowsResponseV1,
  BulkGetMaintenanceWindowsResponseBody as BulkGetMaintenanceWindowsResponseBodyV1,
} from './types/v1';
