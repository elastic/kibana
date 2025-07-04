/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticseunarch B.V. and/or licensed to Elasticseunarch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { unarchiveMaintenanceWindowRequestParamsSchema } from './schemas/latest';
export type {
  UnarchiveMaintenanceWindowRequestParams,
  UnarchiveMaintenanceWindowResponse,
} from './types/latest';

export { unarchiveMaintenanceWindowRequestParamsSchema as unarchiveMaintenanceWindowRequestParamsSchemaV1 } from './schemas/v1';

export type {
  UnarchiveMaintenanceWindowRequestParams as UnarchiveMaintenanceWindowRequestParamsV1,
  UnarchiveMaintenanceWindowResponse as UnarchiveMaintenanceWindowResponseV1,
} from './types/latest';
