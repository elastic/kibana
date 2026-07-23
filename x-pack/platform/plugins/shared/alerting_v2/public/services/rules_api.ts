/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import { buildPath } from '@kbn/core-http-browser';
import type {
  BulkByIdsParams,
  BulkByQueryParams,
  BulkByQueryResult,
  BulkResponse,
  CreateRuleData,
  DryRunResponse,
  FindRulesResponse,
  FindRulesSortField,
  RuleResponse,
  UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '../constants';

/**
 * Encodes the `id` path parameter safely. Wraps `buildPath` so a single call
 * site owns the template.
 */
const buildRulePath = (id: string): string =>
  buildPath(`${ALERTING_V2_RULE_API_PATH}/{id}`, { id });

/** Re-exported from the shared schemas package. */
export type { RuleResponse as RuleApiResponse, FindRulesResponse };

export interface ListRulesParams {
  page?: number;
  perPage?: number;
  filter?: string;
  search?: string;
  sortField?: FindRulesSortField;
  sortOrder?: 'asc' | 'desc';
}

export type { BulkByIdsParams, BulkByQueryParams, BulkByQueryResult, BulkResponse, DryRunResponse };

@injectable()
export class RulesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listTags(params: { filter?: string } = {}) {
    return this.http.get<{ tags: string[] }>(`${ALERTING_V2_RULE_API_PATH}/_tags`, {
      query: { filter: params.filter },
    });
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

  public async upsertRule(id: string, payload: CreateRuleData) {
    return this.http.put<RuleResponse>(buildRulePath(id), {
      body: JSON.stringify(payload),
    });
  }

  public async getRule(id: string, signal?: AbortSignal) {
    return this.http.get<RuleResponse>(buildRulePath(id), { signal });
  }

  public async updateRule(id: string, payload: UpdateRuleData) {
    return this.http.patch<RuleResponse>(buildRulePath(id), {
      body: JSON.stringify(payload),
    });
  }

  public async deleteRule(id: string) {
    return this.http.delete<RuleResponse>(buildRulePath(id));
  }

  public async bulkDeleteRules(params: BulkByIdsParams) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_RULE_API_PATH}/_bulk_delete`, {
      body: JSON.stringify(params),
    });
  }

  public async bulkEnableRules(params: BulkByIdsParams) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_RULE_API_PATH}/_bulk_enable`, {
      body: JSON.stringify(params),
    });
  }

  public async bulkDisableRules(params: BulkByIdsParams) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_RULE_API_PATH}/_bulk_disable`, {
      body: JSON.stringify(params),
    });
  }

  public async deleteRulesByQuery(
    params: BulkByQueryParams & { force: true }
  ): Promise<BulkResponse>;
  public async deleteRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult>;
  public async deleteRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult> {
    return this.http.post<BulkByQueryResult>(`${ALERTING_V2_RULE_API_PATH}/_delete_by_query`, {
      body: JSON.stringify(params),
    });
  }

  public async enableRulesByQuery(
    params: BulkByQueryParams & { force: true }
  ): Promise<BulkResponse>;
  public async enableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult>;
  public async enableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult> {
    return this.http.post<BulkByQueryResult>(`${ALERTING_V2_RULE_API_PATH}/_enable_by_query`, {
      body: JSON.stringify(params),
    });
  }

  public async disableRulesByQuery(
    params: BulkByQueryParams & { force: true }
  ): Promise<BulkResponse>;
  public async disableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult>;
  public async disableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult> {
    return this.http.post<BulkByQueryResult>(`${ALERTING_V2_RULE_API_PATH}/_disable_by_query`, {
      body: JSON.stringify(params),
    });
  }
}
