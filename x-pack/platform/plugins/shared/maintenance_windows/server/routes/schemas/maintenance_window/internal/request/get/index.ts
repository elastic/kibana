/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getParamsSchema } from './schemas/latest';
export type {
  GetMaintenanceWindowRequestParams,
  GetMaintenanceWindowResponse,
} from './types/latest';

export { getParamsSchema as getParamsSchemaV1 } from './schemas/v1';
export type {
  GetMaintenanceWindowRequestParams as GetMaintenanceWindowRequestParamsV1,
  GetMaintenanceWindowResponse as GetMaintenanceWindowResponseV1,
} from './types/v1';
