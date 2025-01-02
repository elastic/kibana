/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { updateParamsSchema, updateBodySchema } from './schemas/latest';
export type {
  UpdateMaintenanceWindowRequestParams,
  UpdateMaintenanceWindowRequestBody,
  UpdateMaintenanceWindowResponse,
} from './types/latest';

export {
  updateParamsSchema as updateParamsSchemaV1,
  updateBodySchema as updateBodySchemaV1,
} from './schemas/v1';
export type {
  UpdateMaintenanceWindowRequestParams as UpdateMaintenanceWindowRequestParamsV1,
  UpdateMaintenanceWindowRequestBody as UpdateMaintenanceWindowRequestBodyV1,
  UpdateMaintenanceWindowResponse as UpdateMaintenanceWindowResponseV1,
} from './types/v1';
