/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRuleToRuleResponseInternalV1 } from '../../../../../transforms';
import type { Rule, RuleParams } from '../../../../../../../application/rule/types';

export const transformGetResponseInternal = <Params extends RuleParams>(rule: Rule<Params>) =>
  transformRuleToRuleResponseInternalV1<Params>(rule);
