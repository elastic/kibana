/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createBodySchema } from './schemas/latest';
export type {
  CreateMaintenanceWindowRequestBody,
  CreateMaintenanceWindowResponse,
} from './types/latest';

export { createBodySchema as createBodySchemaV1 } from './schemas/v1';
export type {
  CreateMaintenanceWindowRequestBody as CreateMaintenanceWindowRequestBodyV1,
  CreateMaintenanceWindowResponse as CreateMaintenanceWindowResponseV1,
} from './types/v1';
