/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getScheduleFrequencyResponseSchema,
  getScheduleFrequencyResponseBodySchema,
} from './schemas/latest';

export type {
  GetScheduleFrequencyResponse,
  GetScheduleFrequencyResponseBody,
} from './types/latest';

export {
  getScheduleFrequencyResponseSchema as getScheduleFrequencyResponseSchemaV1,
  getScheduleFrequencyResponseBodySchema as getScheduleFrequencyResponseBodySchemaV1,
} from './schemas/v1';

export type {
  GetScheduleFrequencyResponse as GetScheduleFrequencyResponseV1,
  GetScheduleFrequencyResponseBody as GetScheduleFrequencyResponseBodyV1,
} from './types/v1';
