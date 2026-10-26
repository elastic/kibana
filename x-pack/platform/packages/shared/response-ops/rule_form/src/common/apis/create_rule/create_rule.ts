/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-types';
import type { Rule } from '../../types';
import type { CreateRuleBody } from '.';
import { transformCreateRuleBody } from '.';
import { BASE_ALERTING_API_PATH } from '../../../constants';
import { transformRule } from '../../transformations';

export async function createRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: CreateRuleBody;
}): Promise<Rule> {
  const res = await http.post<AsApiContract<Rule>>(`${BASE_ALERTING_API_PATH}/rule`, {
    body: JSON.stringify(transformCreateRuleBody(rule)),
  });
  return transformRule(res);
}
