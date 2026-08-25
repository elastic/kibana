/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { archiveBodySchema, archiveParamsSchema } from './schemas/latest';
export type {
  ArchiveMaintenanceWindowRequestBody,
  ArchiveMaintenanceWindowRequestParams,
  ArchiveMaintenanceWindowResponse,
} from './types/latest';

export {
  archiveBodySchema as archiveBodySchemaV1,
  archiveParamsSchema as archiveParamsSchemaV1,
} from './schemas/v1';
export type {
  ArchiveMaintenanceWindowRequestBody as ArchiveMaintenanceWindowRequestBodyV1,
  ArchiveMaintenanceWindowRequestParams as ArchiveMaintenanceWindowRequestParamsV1,
  ArchiveMaintenanceWindowResponse as ArchiveMaintenanceWindowResponseV1,
} from './types/latest';
