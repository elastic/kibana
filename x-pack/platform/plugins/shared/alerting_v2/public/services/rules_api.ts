/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from '../constants';
import type { CreateRuleData } from '../../common/types';

export interface RuleListItem {
  id: string;
  name: string;
  enabled?: boolean;
  query?: string;
  schedule?: { custom?: string };
  tags?: string[];
}

export interface RuleDetails extends RuleListItem {
  timeField?: string;
  lookbackWindow?: string;
  groupingKey?: string[];
}

export interface FindRulesResponse {
  items: RuleListItem[];
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
    return this.http.post(INTERNAL_ALERTING_V2_RULE_API_PATH, {
      body: JSON.stringify(payload),
    });
  }

  public async getRule(id: string) {
    return this.http.get<RuleDetails>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`);
  }

  public async updateRule(id: string, payload: CreateRuleData) {
    return this.http.patch(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`, {
      body: JSON.stringify(payload),
    });
  }
}
