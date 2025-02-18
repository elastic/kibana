/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { healthFrameworkResponseSchema } from './schemas/latest';
export type { HealthFrameworkResponse } from './types/latest';

export {
  healthFrameworkResponseBodySchema as healthFrameworkResponseBodySchemaV1,
  healthFrameworkResponseSchema as healthFrameworkResponseSchemaV1,
} from './schemas/v1';
export type { HealthFrameworkResponseBody as HealthFrameworkResponseBodyV1 } from './types/v1';
