/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { maintenanceWindowCategoryIdTypes } from './constants/latest';
export type { MaintenanceWindowCategoryIdTypes } from './constants/latest';
export {
  maintenanceWindowCategoryIdsSchema,
  maintenanceWindowScopedQuerySchema,
  maintenanceWindowRRuleRequestSchema,
} from './schemas/latest';
export type { MaintenanceWindowCategoryIds } from './types/latest';

export { maintenanceWindowCategoryIdTypes as maintenanceWindowCategoryIdTypesV1 } from './constants/v1';
export type { MaintenanceWindowCategoryIdTypes as MaintenanceWindowCategoryIdTypesV1 } from './constants/v1';
export {
  maintenanceWindowCategoryIdsSchema as maintenanceWindowCategoryIdsSchemaV1,
  maintenanceWindowScopedQuerySchema as maintenanceWindowScopedQuerySchemaV1,
  maintenanceWindowRRuleRequestSchema as maintenanceWindowRRuleRequestSchemaV1,
} from './schemas/v1';
export type { MaintenanceWindowCategoryIds as MaintenanceWindowCategoryIdsV1 } from './types/v1';
