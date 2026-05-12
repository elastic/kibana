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
  BulkActionActionPoliciesBody,
  CreateActionPolicyData,
  ActionPolicyResponse,
  UpdateActionPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';

export interface BulkActionActionPoliciesResponse {
  processed: number;
  total: number;
  errors: Array<{ id: string; message: string }>;
}

export interface FindActionPoliciesResponse {
  items: ActionPolicyResponse[];
  total: number;
  page: number;
  perPage: number;
}

@injectable()
export class ActionPoliciesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async getActionPolicy(id: string) {
    return this.http.get<ActionPolicyResponse>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}`);
  }

  public async listActionPolicies(params: {
    page?: number;
    perPage?: number;
    search?: string;
    tags?: string[];
    enabled?: boolean;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return this.http.get<FindActionPoliciesResponse>(ALERTING_V2_ACTION_POLICY_API_PATH, {
      query: {
        page: params.page,
        perPage: params.perPage,
        search: params.search || undefined,
        tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
        enabled: params.enabled,
        sortField: params.sortField,
        sortOrder: params.sortOrder,
      },
    });
  }

  public async createActionPolicy(data: CreateActionPolicyData) {
    return this.http.post<ActionPolicyResponse>(ALERTING_V2_ACTION_POLICY_API_PATH, {
      body: JSON.stringify(data),
    });
  }

  public async updateActionPolicy(id: string, data: UpdateActionPolicyBody) {
    return this.http.patch<ActionPolicyResponse>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}`, {
      body: JSON.stringify(data),
    });
  }

  public async deleteActionPolicy(id: string) {
    await this.http.delete(`${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}`);
  }

  public async enableActionPolicy(id: string) {
    return this.http.post<ActionPolicyResponse>(
      `${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}/_enable`
    );
  }

  public async disableActionPolicy(id: string) {
    return this.http.post<ActionPolicyResponse>(
      `${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}/_disable`
    );
  }

  public async snoozeActionPolicy(id: string, snoozedUntil: string) {
    return this.http.post<ActionPolicyResponse>(
      `${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}/_snooze`,
      { body: JSON.stringify({ snoozedUntil }) }
    );
  }

  public async unsnoozeActionPolicy(id: string) {
    return this.http.post<ActionPolicyResponse>(
      `${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}/_unsnooze`
    );
  }

  public async updateActionPolicyApiKey(id: string) {
    await this.http.post(`${ALERTING_V2_ACTION_POLICY_API_PATH}/${id}/_update_api_key`);
  }

  public async bulkActionActionPolicies(body: BulkActionActionPoliciesBody) {
    return this.http.post<BulkActionActionPoliciesResponse>(
      `${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk`,
      { body: JSON.stringify(body) }
    );
  }

  public async fetchDataFields() {
    return this.http.get<string[]>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/data_fields`);
  }

  public async fetchTags(params?: { search?: string }) {
    return this.http.get<string[]>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/tags`, {
      query: {
        search: params?.search || undefined,
      },
    });
  }
}
