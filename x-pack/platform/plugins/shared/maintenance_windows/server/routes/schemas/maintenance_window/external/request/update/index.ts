/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { updateMaintenanceWindowRequestBodySchema } from './schemas/latest';
export type {
  UpdateMaintenanceWindowRequestBody,
  UpdateMaintenanceWindowRequestParams,
  UpdateMaintenanceWindowResponse,
} from './types/latest';

export {
  updateMaintenanceWindowRequestBodySchema as updateMaintenanceWindowRequestBodySchemaV1,
  updateMaintenanceWindowRequestParamsSchema as updateMaintenanceWindowRequestParamsSchemaV1,
} from './schemas/v1';

export type {
  UpdateMaintenanceWindowRequestParams as UpdateMaintenanceWindowRequestParamsV1,
  UpdateMaintenanceWindowRequestBody as UpdateMaintenanceWindowRequestBodyV1,
  UpdateMaintenanceWindowResponse as UpdateMaintenanceWindowResponseV1,
} from './types/v1';
