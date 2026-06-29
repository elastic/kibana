/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type { GetRuleExecutionsQuery, GetRuleExecutionsResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH } from '../constants';

export type { GetRuleExecutionsResponse };

@injectable()
export class RuleExecutionHistoryApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async getRuleExecutions(params: Partial<GetRuleExecutionsQuery> = {}) {
    return this.http.get<GetRuleExecutionsResponse>(ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH, {
      query: {
        ruleId: params.ruleId,
        outcome: params.outcome,
        from: params.from,
        to: params.to,
        sort: params.sort,
        sortOrder: params.sortOrder,
        page: params.page,
        perPage: params.perPage,
      },
    });
  }
}
