/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { MaintenanceWindowResponseV1 } from '../../../response';
import { finishParamsSchemaV1 } from '..';

export type FinishMaintenanceWindowRequestParams = TypeOf<typeof finishParamsSchemaV1>;

export interface FinishMaintenanceWindowResponse {
  body: MaintenanceWindowResponseV1;
}
