/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { MaintenanceWindowResponseV1 } from '../../../response';
import type { unarchiveMaintenanceWindowRequestParamsSchemaV1 } from '..';

export type UnarchiveMaintenanceWindowRequestParams = TypeOf<
  typeof unarchiveMaintenanceWindowRequestParamsSchemaV1
>;

export interface UnarchiveMaintenanceWindowResponse {
  body: MaintenanceWindowResponseV1;
}
