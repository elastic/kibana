/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {
  aggregateRulesRequestBodySchema,
  aggregateRulesResponseBodySchema,
} from './schemas/latest';
export type { AggregateRulesRequestBody, AggregateRulesResponseBody } from './types/latest';

export {
  aggregateRulesRequestBodySchema as aggregateRulesRequestBodySchemaV1,
  aggregateRulesResponseBodySchema as aggregateRulesResponseBodySchemaV1,
} from './schemas/v1';
export type {
  AggregateRulesRequestBody as AggregateRulesRequestBodyV1,
  AggregateRulesResponseBody as AggregateRulesResponseBodyV1,
  AggregateRulesResponse as AggregateRulesResponseV1,
} from './types/v1';
