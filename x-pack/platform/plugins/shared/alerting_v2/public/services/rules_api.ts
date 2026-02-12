/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type { CreateRuleData, RuleResponse, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from '../constants';

/** Re-exported from the shared schemas package. */
export type { RuleResponse as RuleApiResponse };

export interface FindRulesResponse {
  items: RuleResponse[];
  total: number;
  page: number;
  perPage: number;
}

@injectable()
export class RulesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listRules(params: { page?: number; perPage?: number }) {
    return this.http.get<FindRulesResponse>(INTERNAL_ALERTING_V2_RULE_API_PATH, {
      query: { page: params.page, perPage: params.perPage },
    });
  }

  public async createRule(payload: CreateRuleData) {
    return this.http.post<RuleResponse>(INTERNAL_ALERTING_V2_RULE_API_PATH, {
      body: JSON.stringify(payload),
    });
  }

  public async getRule(id: string) {
    return this.http.get<RuleResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`);
  }

  public async updateRule(id: string, payload: UpdateRuleData) {
    return this.http.patch<RuleResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`, {
      body: JSON.stringify(payload),
    });
  }
}
