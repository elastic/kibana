/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type { CreateRuleData, RuleKind, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from '../constants';

/**
 * Shape returned by the server API for a single rule.
 * Mirrors the server-side RuleResponse type.
 */
export interface RuleApiResponse {
  id: string;
  kind: RuleKind;
  metadata: {
    name: string;
    owner?: string;
    labels?: string[];
    time_field: string;
  };
  schedule: {
    every: string;
    lookback?: string;
  };
  evaluation: {
    query: {
      base: string;
      trigger: { condition: string };
    };
  };
  recovery_policy?: CreateRuleData['recovery_policy'];
  state_transition?: CreateRuleData['state_transition'];
  grouping?: { fields: string[] };
  no_data?: CreateRuleData['no_data'];
  notification_policies?: CreateRuleData['notification_policies'];
  enabled: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedBy?: string | null;
  updatedAt?: string;
}

export interface FindRulesResponse {
  items: RuleApiResponse[];
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
    return this.http.post<RuleApiResponse>(INTERNAL_ALERTING_V2_RULE_API_PATH, {
      body: JSON.stringify(payload),
    });
  }

  public async getRule(id: string) {
    return this.http.get<RuleApiResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`);
  }

  public async updateRule(id: string, payload: UpdateRuleData) {
    return this.http.patch<RuleApiResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`, {
      body: JSON.stringify(payload),
    });
  }
}
