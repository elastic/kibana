/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type {
  BulkOperationParams,
  BulkOperationResponse,
  CreateRuleData,
  FindRulesSortField,
  RuleResponse,
  UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '../constants';

/** Re-exported from the shared schemas package. */
export type { RuleResponse as RuleApiResponse };

export interface FindRulesResponse {
  items: RuleResponse[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListRulesParams {
  page?: number;
  perPage?: number;
  filter?: string;
  search?: string;
  sortField?: FindRulesSortField;
  sortOrder?: 'asc' | 'desc';
}

export type { BulkOperationParams, BulkOperationResponse };

@injectable()
export class RulesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listTags() {
    return this.http.get<{ tags: string[] }>(`${ALERTING_V2_RULE_API_PATH}/_tags`);
  }

  public async listRules(params: ListRulesParams) {
    return this.http.get<FindRulesResponse>(ALERTING_V2_RULE_API_PATH, {
      query: {
        page: params.page,
        perPage: params.perPage,
        filter: params.filter,
        search: params.search,
        sortField: params.sortField,
        sortOrder: params.sortOrder,
      },
    });
  }

  public async createRule(payload: CreateRuleData) {
    return this.http.post<RuleResponse>(ALERTING_V2_RULE_API_PATH, {
      body: JSON.stringify(payload),
    });
  }

  public async getRule(id: string) {
    return this.http.get<RuleResponse>(`${ALERTING_V2_RULE_API_PATH}/${id}`);
  }

  public async updateRule(id: string, payload: UpdateRuleData) {
    return this.http.patch<RuleResponse>(`${ALERTING_V2_RULE_API_PATH}/${id}`, {
      body: JSON.stringify(payload),
    });
  }

  public async deleteRule(id: string) {
    return this.http.delete<RuleResponse>(`${ALERTING_V2_RULE_API_PATH}/${id}`);
  }

  public async bulkDeleteRules(params: BulkOperationParams) {
    return this.http.post<BulkOperationResponse>(`${ALERTING_V2_RULE_API_PATH}/_bulk_delete`, {
      body: JSON.stringify(params),
    });
  }

  public async bulkEnableRules(params: BulkOperationParams) {
    return this.http.post<BulkOperationResponse>(`${ALERTING_V2_RULE_API_PATH}/_bulk_enable`, {
      body: JSON.stringify(params),
    });
  }

  public async bulkDisableRules(params: BulkOperationParams) {
    return this.http.post<BulkOperationResponse>(`${ALERTING_V2_RULE_API_PATH}/_bulk_disable`, {
      body: JSON.stringify(params),
    });
  }
}
