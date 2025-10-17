/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  gapAutoFillSchedulerBodySchema,
  gapAutoFillSchedulerResponseSchema,
} from './schemas/latest';
export type {
  GapAutoFillSchedulerRequestBody,
  GapAutoFillSchedulerResponseBody,
  GapAutoFillSchedulerResponse,
  UpdateGapAutoFillSchedulerResponse,
} from './types/latest';

export {
  gapAutoFillSchedulerBodySchema as gapAutoFillSchedulerBodySchemaV1,
  gapAutoFillSchedulerResponseSchema as gapAutoFillSchedulerResponseSchemaV1,
} from './schemas/v1';
export type {
  GapAutoFillSchedulerRequestBody as GapAutoFillSchedulerRequestBodyV1,
  GapAutoFillSchedulerResponseBody as GapAutoFillSchedulerResponseBodyV1,
  GapAutoFillSchedulerResponse as GapAutoFillSchedulerResponseV1,
  UpdateGapAutoFillSchedulerResponse as UpdateGapAutoFillSchedulerResponseV1,
} from './types/v1';
