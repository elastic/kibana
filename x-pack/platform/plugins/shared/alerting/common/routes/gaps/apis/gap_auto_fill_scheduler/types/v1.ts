/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  gapAutoFillSchedulerBodySchemaV1,
  gapAutoFillSchedulerResponseSchemaV1,
  getGapAutoFillSchedulerParamsSchemaV1,
} from '..';

export type GapAutoFillSchedulerRequestBody = TypeOf<typeof gapAutoFillSchedulerBodySchemaV1>;
export type GapAutoFillSchedulerResponseBody = TypeOf<typeof gapAutoFillSchedulerResponseSchemaV1>;
export type GetGapAutoFillSchedulerParams = TypeOf<typeof getGapAutoFillSchedulerParamsSchemaV1>;
export interface GapAutoFillSchedulerResponse {
  body: GapAutoFillSchedulerResponseBody;
}

export interface UpdateGapAutoFillSchedulerResponse {
  body: GapAutoFillSchedulerResponseBody;
}
