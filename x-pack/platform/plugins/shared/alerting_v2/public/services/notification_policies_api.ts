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
  BulkActionNotificationPoliciesBody,
  CreateNotificationPolicyData,
  NotificationPolicyResponse,
  UpdateNotificationPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';

export interface BulkActionNotificationPoliciesResponse {
  processed: number;
  total: number;
  errors: Array<{ id: string; message: string }>;
}

export interface FindNotificationPoliciesResponse {
  items: NotificationPolicyResponse[];
  total: number;
  page: number;
  perPage: number;
}

@injectable()
export class NotificationPoliciesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async getNotificationPolicy(id: string) {
    return this.http.get<NotificationPolicyResponse>(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}`
    );
  }

  public async listNotificationPolicies(params: {
    page?: number;
    perPage?: number;
    search?: string;
    enabled?: boolean;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return this.http.get<FindNotificationPoliciesResponse>(
      INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH,
      {
        query: {
          page: params.page,
          perPage: params.perPage,
          search: params.search || undefined,
          enabled: params.enabled,
          sortField: params.sortField,
          sortOrder: params.sortOrder,
        },
      }
    );
  }

  public async createNotificationPolicy(data: CreateNotificationPolicyData) {
    return this.http.post<NotificationPolicyResponse>(
      INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH,
      { body: JSON.stringify(data) }
    );
  }

  public async updateNotificationPolicy(id: string, data: UpdateNotificationPolicyBody) {
    return this.http.put<NotificationPolicyResponse>(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}`,
      { body: JSON.stringify(data) }
    );
  }

  public async deleteNotificationPolicy(id: string) {
    await this.http.delete(`${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}`);
  }

  public async enableNotificationPolicy(id: string) {
    return this.http.post<NotificationPolicyResponse>(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}/_enable`
    );
  }

  public async disableNotificationPolicy(id: string) {
    return this.http.post<NotificationPolicyResponse>(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}/_disable`
    );
  }

  public async snoozeNotificationPolicy(id: string, snoozedUntil: string) {
    return this.http.post<NotificationPolicyResponse>(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}/_snooze`,
      { body: JSON.stringify({ snoozedUntil }) }
    );
  }

  public async unsnoozeNotificationPolicy(id: string) {
    return this.http.post<NotificationPolicyResponse>(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}/_unsnooze`
    );
  }

  public async updateNotificationPolicyApiKey(id: string) {
    await this.http.post(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/${id}/_update_api_key`
    );
  }

  public async bulkActionNotificationPolicies(body: BulkActionNotificationPoliciesBody) {
    return this.http.post<BulkActionNotificationPoliciesResponse>(
      `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/_bulk`,
      { body: JSON.stringify(body) }
    );
  }
}
