/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRuleExecutionsResponse } from '@kbn/alerting-v2-schemas';
import type { FindRuleExecutionsQuery } from '../services/event_log_service/types';

/**
 * Client-side arguments for {@link ExecutionHistoryClientContract.getRuleExecutions}.
 */
export type GetRuleExecutionsArgs = Omit<FindRuleExecutionsQuery, 'spaceId'>;

export interface ExecutionHistoryClientContract {
  getRuleExecutions(args: GetRuleExecutionsArgs): Promise<GetRuleExecutionsResponse>;
}
