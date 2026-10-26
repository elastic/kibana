/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ruleQueryInspectorParamsSchema,
  ruleQueryInspectorQuerySchema,
  ruleQueryInspectorResponseSchema,
  ruleQueryInspectorExamples,
} from './schemas/latest';
export type {
  RuleQueryInspectorRequestParams,
  RuleQueryInspectorRequestQuery,
  RuleQueryInspectorResponseBody,
  RuleQueryInspectorResponse,
} from './types/latest';

export {
  ruleQueryInspectorParamsSchema as ruleQueryInspectorParamsSchemaV1,
  ruleQueryInspectorQuerySchema as ruleQueryInspectorQuerySchemaV1,
  ruleQueryInspectorResponseSchema as ruleQueryInspectorResponseSchemaV1,
  ruleQueryInspectorExamples as ruleQueryInspectorExamplesV1,
} from './schemas/v1';
export type {
  RuleQueryInspectorRequestParams as RuleQueryInspectorRequestParamsV1,
  RuleQueryInspectorRequestQuery as RuleQueryInspectorRequestQueryV1,
  RuleQueryInspectorResponseBody as RuleQueryInspectorResponseBodyV1,
  RuleQueryInspectorResponse as RuleQueryInspectorResponseV1,
} from './types/v1';
