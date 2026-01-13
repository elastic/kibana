/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { rRuleRequestSchema } from './request/schemas/latest';
export { rRuleResponseSchema } from './response/schemas/latest';
export type { RRuleRequest } from './request/types/latest';
export type { RRuleResponse } from './response/types/latest';

export { rRuleRequestSchema as rRuleRequestSchemaV1 } from './request/schemas/v1';
export { rRuleResponseSchema as rRuleResponseSchemaV1 } from './response/schemas/v1';
export type { RRuleRequest as RRuleRequestV1 } from './request/types/v1';
export type { RRuleResponse as RRuleResponseV1 } from './response/types/v1';
