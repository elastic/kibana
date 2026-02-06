/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { ChangeHistoryDocument } from '../lib/change_tracking';
import type { RulesClientContext } from '../types';

export interface GetHistoryByParams {
  module: RuleTypeSolution;
  ruleId: string;
  dateStart?: string;
  dateEnd?: string;
  user?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

export interface GetHistoryResult {
  items: ChangeHistoryDocument[];
  total: number;
}

export async function getHistoryForRule(
  context: RulesClientContext,
  params: GetHistoryByParams
): Promise<GetHistoryResult> {
  context.logger.debug(`getHistoryForRule(): getting history log for rule ${params.ruleId}`);
  if (context.changeTrackingService?.initialized(params.module)) {
    return await context.changeTrackingService.getHistory(params.module, params.ruleId);
  }
  return {
    total: 0,
    items: [],
  };
}
