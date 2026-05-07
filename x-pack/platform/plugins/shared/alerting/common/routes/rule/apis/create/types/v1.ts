/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RuleParamsV1, RuleResponseV1 } from '../../../response';
import type { actionSchemaV1, actionFrequencySchemaV1, createParamsSchemaV1 } from '..';
import type { fallbackCreateBodySchema } from '../schemas/v1';

export type CreateRuleAction = TypeOf<typeof actionSchemaV1>;
export type CreateRuleActionFrequency = TypeOf<typeof actionFrequencySchemaV1>;

export type CreateRuleRequestParams = TypeOf<typeof createParamsSchemaV1>;

/**
 * Uses the fallback object branch shape plus a generic `params`, matching validated request
 * bodies while avoiding `unknown` from `TypeOf<schema.oneOf(...)>` under this toolchain.
 */
type FallbackCreateBody = TypeOf<typeof fallbackCreateBodySchema>;

export type CreateRuleRequestBody<Params extends RuleParamsV1 = never> = Omit<
  FallbackCreateBody,
  'params'
> & { params: Params };

export interface CreateRuleResponse<Params extends RuleParamsV1 = never> {
  body: RuleResponseV1<Params>;
}
