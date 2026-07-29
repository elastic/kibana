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
  BulkResponse,
  CreateActionPolicyData,
  ActionPolicyResponse,
  UpdateActionPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';

export interface FindActionPoliciesResponse {
  items: ActionPolicyResponse[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * Encodes the `id` path parameter safely. Wraps `buildPath` so a single call
 * site owns the template; `action` appends a static sub-resource segment
 * (e.g. `_enable`) to the per-policy path.
 */
const buildActionPolicyPath = (id: string, action?: string): string =>
  buildPath(
    action
      ? `${ALERTING_V2_ACTION_POLICY_API_PATH}/{id}/${action}`
      : `${ALERTING_V2_ACTION_POLICY_API_PATH}/{id}`,
    { id }
  );

@injectable()
export class ActionPoliciesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async getActionPolicy(id: string) {
    return this.http.get<ActionPolicyResponse>(buildActionPolicyPath(id));
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

  public async upsertActionPolicy(id: string, data: CreateActionPolicyData) {
    return this.http.put<ActionPolicyResponse>(buildActionPolicyPath(id), {
      body: JSON.stringify(data),
    });
  }

  public async updateActionPolicy(id: string, data: UpdateActionPolicyBody) {
    return this.http.patch<ActionPolicyResponse>(buildActionPolicyPath(id), {
      body: JSON.stringify(data),
    });
  }

  public async deleteActionPolicy(id: string) {
    await this.http.delete(buildActionPolicyPath(id));
  }

  public async enableActionPolicy(id: string) {
    return this.http.post<ActionPolicyResponse>(buildActionPolicyPath(id, '_enable'));
  }

  public async disableActionPolicy(id: string) {
    return this.http.post<ActionPolicyResponse>(buildActionPolicyPath(id, '_disable'));
  }

  public async snoozeActionPolicy(id: string, snoozedUntil: string) {
    return this.http.post<ActionPolicyResponse>(buildActionPolicyPath(id, '_snooze'), {
      body: JSON.stringify({ snoozedUntil }),
    });
  }

  public async unsnoozeActionPolicy(id: string) {
    return this.http.post<ActionPolicyResponse>(buildActionPolicyPath(id, '_unsnooze'));
  }

  public async updateActionPolicyApiKey(id: string) {
    await this.http.post(buildActionPolicyPath(id, '_update_api_key'));
  }

  public async bulkDeleteActionPolicies(ids: string[]) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk_delete`, {
      body: JSON.stringify({ ids }),
    });
  }

  public async bulkEnableActionPolicies(ids: string[]) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk_enable`, {
      body: JSON.stringify({ ids }),
    });
  }

  public async bulkDisableActionPolicies(ids: string[]) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk_disable`, {
      body: JSON.stringify({ ids }),
    });
  }

  public async bulkSnoozeActionPolicies(ids: string[], snoozedUntil: string) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk_snooze`, {
      body: JSON.stringify({ ids, snoozedUntil }),
    });
  }

  public async bulkUnsnoozeActionPolicies(ids: string[]) {
    return this.http.post<BulkResponse>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk_unsnooze`, {
      body: JSON.stringify({ ids }),
    });
  }

  public async bulkUpdateApiKeyActionPolicies(ids: string[]) {
    return this.http.post<BulkResponse>(
      `${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk_update_api_key`,
      { body: JSON.stringify({ ids }) }
    );
  }

  public async fetchRuleEventFields(matcher?: string) {
    const trimmed = matcher?.trim();
    return this.http.get<string[]>(
      ALERTING_V2_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH,
      trimmed ? { query: { matcher: trimmed } } : {}
    );
  }

  public async fetchTags(params?: { search?: string }) {
    return this.http.get<string[]>(`${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/tags`, {
      query: {
        search: params?.search || undefined,
      },
    });
  }
}
