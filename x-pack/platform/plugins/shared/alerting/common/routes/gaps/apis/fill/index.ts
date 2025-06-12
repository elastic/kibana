/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { fillGapByIdQuerySchema } from './schemas/latest';

export { fillGapByIdQuerySchema as fillGapByIdQuerySchemaV1 } from './schemas/v1';

export type { FillGapByIdQuery as FillGapByIdQueryV1 } from './types/v1';
export type { ScheduleBackfillRequestBodyV1 as FillGapByIdResponseV1 } from '../../../backfill/apis/schedule';
