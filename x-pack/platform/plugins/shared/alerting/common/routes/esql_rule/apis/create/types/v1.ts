/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import type { ESQLRuleResponseV1 } from '../../../response';
import type {
  createESQLRuleParamsSchema as createESQLRuleParamsSchemaV1,
  createESQLBodySchema as createESQLBodySchemaV1,
} from '../schemas/v1';

export type CreateESQLRuleRequestParams = TypeOf<typeof createESQLRuleParamsSchemaV1>;
export type CreateESQLRuleRequestBody = TypeOf<typeof createESQLBodySchemaV1>;

export interface CreateESQLRuleResponse {
  body: ESQLRuleResponseV1;
}
