/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { GetGapsInfoByRuleIdsParams } from '../../../../../../application/rule/methods/get_gaps_info_by_rule_ids/types';
import { GetGapsInfoByRuleIdsQueryV1 } from '../../../../../../../common/routes/gaps/apis/get_gaps_info_by_rule_ids';

export const transformRequest = ({
  rule_ids,
  start,
  end,
}: GetGapsInfoByRuleIdsQueryV1): GetGapsInfoByRuleIdsParams => ({
  ruleIds: rule_ids,
  start,
  end,
});
