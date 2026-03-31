/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateNotificationPolicyData,
  NotificationPolicyBulkAction,
  NotificationPolicyResponse,
  UpdateNotificationPolicyData,
} from '@kbn/alerting-v2-schemas';

export interface UpdateNotificationPolicyParams {
  data: UpdateNotificationPolicyData;
  options: { id: string; version: string };
}

export interface CreateNotificationPolicyParams {
  data: CreateNotificationPolicyData;
  options?: { id?: string };
}

export interface SnoozeNotificationPolicyParams {
  id: string;
  snoozedUntil: string;
}

export interface UpdateNotificationPolicyApiKeyParams {
  id: string;
}

export interface BulkActionNotificationPoliciesParams {
  actions: NotificationPolicyBulkAction[];
}

export interface BulkActionNotificationPoliciesResponse {
  processed: number;
  total: number;
  errors: Array<{ id: string; message: string }>;
}
export type FindNotificationPoliciesSortField =
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'createdByUsername'
  | 'updatedByUsername';

export interface FindNotificationPoliciesParams {
  page?: number;
  perPage?: number;
  search?: string;
  destinationType?: string;
  createdBy?: string;
  enabled?: boolean;
  sortField?: FindNotificationPoliciesSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface FindNotificationPoliciesResponse {
  items: NotificationPolicyResponse[];
  total: number;
  page: number;
  perPage: number;
}
