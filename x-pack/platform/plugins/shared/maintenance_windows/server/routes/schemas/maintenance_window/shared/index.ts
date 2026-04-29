/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { maintenanceWindowCategoryIdTypes, maintenanceWindowStatus } from './constants/latest';
export {
  maintenanceWindowCategoryIdsSchema,
  maintenanceWindowStatusSchema,
} from './schemas/latest';
export type { MaintenanceWindowCategoryIds } from './types/latest';

export {
  maintenanceWindowCategoryIdTypes as maintenanceWindowCategoryIdTypesV1,
  maintenanceWindowStatus as maintenanceWindowStatusV1,
} from './constants/v1';
export {
  maintenanceWindowCategoryIdsSchema as maintenanceWindowCategoryIdsSchemaV1,
  maintenanceWindowStatusSchema as maintenanceWindowStatusSchemaV1,
} from './schemas/v1';
export type { MaintenanceWindowCategoryIds as MaintenanceWindowCategoryIdsV1 } from './types/v1';

export { validatePagination } from './validation/latest';
export { validatePagination as validatePaginationV1 } from './validation/v1';
