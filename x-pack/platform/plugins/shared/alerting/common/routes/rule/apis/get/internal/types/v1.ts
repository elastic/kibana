/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RuleParamsV1, RuleResponseInternalV1 } from '../../../../response';
import type { getInternalRuleRequestParamsSchemaV1 } from '..';

export type GetInternalRuleRequestParams = TypeOf<typeof getInternalRuleRequestParamsSchemaV1>;

export interface GetInternalRuleResponse<Params extends RuleParamsV1 = never> {
  body: RuleResponseInternalV1<Params>;
}
