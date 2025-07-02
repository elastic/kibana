/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { maintenanceWindowResponseSchema } from './schemas/latest';
export { maintenanceWindowStatus } from './constants/latest';
export type { MaintenanceWindowStatus } from './constants/latest';
export type { MaintenanceWindowResponse } from './types/latest';

export { maintenanceWindowResponseSchema as maintenanceWindowResponseSchemaV1 } from './schemas/v1';
export { maintenanceWindowStatus as maintenanceWindowStatusV1 } from './constants/v1';
export type { MaintenanceWindowStatus as MaintenanceWindowStatusV1 } from './constants/v1';
export type { MaintenanceWindowResponse as MaintenanceWindowResponseV1 } from './types/v1';
