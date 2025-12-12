/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRuleToRuleResponseV1 } from '../../../../transforms';
import type { Rule, RuleParams } from '../../../../../../application/rule/types';

export const transformGetResponse = <Params extends RuleParams>(
  rule: Rule<Params>,
  includeArtifacts: boolean = false
) => ({
  ...transformRuleToRuleResponseV1<Params>(rule),
  ...(includeArtifacts && rule.artifacts !== undefined ? { artifacts: rule.artifacts } : {}),
});
