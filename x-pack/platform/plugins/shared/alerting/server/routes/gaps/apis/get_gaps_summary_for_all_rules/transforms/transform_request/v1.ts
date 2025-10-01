/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetGapsSummaryForAllRulesBodyV1 } from '../../../../../../common/routes/gaps/apis/get_gaps_summary_for_all_rules';
import type { GetGapsSummaryForAllRulesParams } from '../../../../../../application/rule/methods/get_gaps_summary_for_all_rules/types';

export const transformRequest = (
  body: GetGapsSummaryForAllRulesBodyV1
): GetGapsSummaryForAllRulesParams => ({
  start: body.start,
  end: body.end,
});


