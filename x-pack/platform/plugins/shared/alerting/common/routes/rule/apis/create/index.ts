/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  actionFrequencySchema,
  actionAlertsFilterSchema,
  actionSchema,
  createParamsSchema,
  createBodySchema,
} from './schemas/latest';

export type {
  CreateRuleAction,
  CreateRuleActionFrequency,
  CreateRuleRequestParams,
  CreateRuleRequestBody,
  CreateRuleResponse,
} from './types/latest';

export {
  actionFrequencySchema as actionFrequencySchemaV1,
  actionAlertsFilterSchema as actionAlertsFilterSchemaV1,
  actionSchema as actionSchemaV1,
  createParamsSchema as createParamsSchemaV1,
  createBodySchema as createBodySchemaV1,
} from './schemas/v1';

export type {
  CreateRuleAction as CreateRuleActionV1,
  CreateRuleActionFrequency as CreateRuleActionFrequencyV1,
  CreateRuleRequestParams as CreateRuleRequestParamsV1,
  CreateRuleRequestBody as CreateRuleRequestBodyV1,
  CreateRuleResponse as CreateRuleResponseV1,
} from './types/v1';

// v2
export {
  actionFrequencySchema as actionFrequencySchemaV2,
  actionAlertsFilterSchema as actionAlertsFilterSchemaV2,
  actionSchema as actionSchemaV2,
  createParamsSchema as createParamsSchemaV2,
  createBodySchema as createBodySchemaV2,
} from './schemas/v2';

export type {
  CreateRuleAction as CreateRuleActionV2,
  CreateRuleActionFrequency as CreateRuleActionFrequencyV2,
  CreateRuleRequestParams as CreateRuleRequestParamsV2,
  CreateRuleRequestBody as CreateRuleRequestBodyV2,
  CreateRuleResponse as CreateRuleResponseV2,
} from './types/v2';
