/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { snoozeAlertParamsSchema } from './schemas/latest';
export {
  snoozeAlertParamsSchema as snoozeAlertParamsSchemaV1,
  snoozeAlertBodySchema as snoozeAlertBodySchemaV1,
  snoozeAlertExamples as snoozeAlertExamplesV1,
} from './schemas/v1';

export type { SnoozeAlertRequestParams } from './types/latest';
export type {
  SnoozeAlertRequestParams as SnoozeAlertRequestParamsV1,
  SnoozeAlertRequestBody as SnoozeAlertRequestBodyV1,
} from './types/v1';
