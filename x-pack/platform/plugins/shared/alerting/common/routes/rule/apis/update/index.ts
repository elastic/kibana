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
  updateBodySchema,
  updateParamsSchema,
} from './schemas/latest';

export type {
  UpdateRuleAction,
  UpdateRuleActionFrequency,
  UpdateRuleRequestParams,
  UpdateRuleRequestBody,
  UpdateRuleResponse,
} from './types/latest';

export {
  actionFrequencySchema as actionFrequencySchemaV1,
  actionAlertsFilterSchema as actionAlertsFilterSchemaV1,
  actionSchema as actionSchemaV1,
  updateBodySchema as updateBodySchemaV1,
  updateParamsSchema as updateParamsSchemaV1,
} from './schemas/v1';

export type {
  UpdateRuleAction as UpdateRuleActionV1,
  UpdateRuleActionFrequency as UpdateRuleActionFrequencyV1,
  UpdateRuleRequestParams as UpdateRuleRequestParamsV1,
  UpdateRuleRequestBody as UpdateRuleRequestBodyV1,
  UpdateRuleResponse as UpdateRuleResponseV1,
} from './types/v1';

// v2
export {
  actionFrequencySchema as actionFrequencySchemaV2,
  actionAlertsFilterSchema as actionAlertsFilterSchemaV2,
  actionSchema as actionSchemaV2,
  updateBodySchema as updateBodySchemaV2,
  updateParamsSchema as updateParamsSchemaV2,
} from './schemas/v2';

export type {
  UpdateRuleAction as UpdateRuleActionV2,
  UpdateRuleActionFrequency as UpdateRuleActionFrequencyV2,
  UpdateRuleRequestParams as UpdateRuleRequestParamsV2,
  UpdateRuleRequestBody as UpdateRuleRequestBodyV2,
  UpdateRuleResponse as UpdateRuleResponseV2,
} from './types/v2';
