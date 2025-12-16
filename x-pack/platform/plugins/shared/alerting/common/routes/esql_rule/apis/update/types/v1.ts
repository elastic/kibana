/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import type { ESQLRuleResponseV1 } from '../../../response';
import type {
  updateESQLRuleParamsSchema as updateESQLRuleParamsSchemaV1,
  updateESQLBodySchema as updateESQLBodySchemaV1,
} from '../schemas/v1';

export type UpdateESQLRuleRequestParams = TypeOf<typeof updateESQLRuleParamsSchemaV1>;
export type UpdateESQLRuleRequestBody = TypeOf<typeof updateESQLBodySchemaV1>;

export interface UpdateESQLRuleResponse {
  body: ESQLRuleResponseV1;
}
