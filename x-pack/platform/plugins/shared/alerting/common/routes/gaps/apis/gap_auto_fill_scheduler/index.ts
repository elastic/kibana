/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  gapAutoFillSchedulerBodySchema,
  gapAutoFillSchedulerResponseSchema,
  getGapAutoFillSchedulerParamsSchema,
} from './schemas/latest';
export type {
  GapAutoFillSchedulerRequestBody,
  GapAutoFillSchedulerResponseBody,
  GapAutoFillSchedulerResponse,
  UpdateGapAutoFillSchedulerResponse,
  GetGapAutoFillSchedulerParams,
} from './types/latest';

export {
  gapAutoFillSchedulerBodySchema as gapAutoFillSchedulerBodySchemaV1,
  gapAutoFillSchedulerResponseSchema as gapAutoFillSchedulerResponseSchemaV1,
  getGapAutoFillSchedulerParamsSchema as getGapAutoFillSchedulerParamsSchemaV1,
} from './schemas/v1';
export type {
  GapAutoFillSchedulerRequestBody as GapAutoFillSchedulerRequestBodyV1,
  GapAutoFillSchedulerResponseBody as GapAutoFillSchedulerResponseBodyV1,
  GapAutoFillSchedulerResponse as GapAutoFillSchedulerResponseV1,
  UpdateGapAutoFillSchedulerResponse as UpdateGapAutoFillSchedulerResponseV1,
  GetGapAutoFillSchedulerParams as GetGapAutoFillSchedulerParamsV1,
} from './types/v1';
