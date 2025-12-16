/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESQLParamsV1 } from '@kbn/response-ops-rule-params';
import type { RuleResponseV1 } from '../../../rule/response';

export type ESQLRuleResponse = RuleResponseV1<ESQLParamsV1> & {
  internal: boolean;
};
