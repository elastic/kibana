/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { RuleResponse, UpdateRuleData } from '@kbn/alerting-v2-schemas';

export type { RuleResponse as RuleApiResponse };

export interface FindRulesResponse {
  items: RuleResponse[];
  total: number;
  page: number;
  perPage: number;
}

export interface BulkOperationError {
  id: string;
  error: { message: string; statusCode: number };
}

export interface BulkOperationResponse {
  rules: RuleResponse[];
  errors: BulkOperationError[];
}

export type BulkOperationParams =
  | { ids: string[]; filter?: undefined }
  | { filter: string; ids?: undefined };

const RULE_API_PATH = '/internal/alerting/v2/rule' as const;

export const listRules = (http: HttpStart, params: { page?: number; perPage?: number }) =>
  http.get<FindRulesResponse>(RULE_API_PATH, {
    query: { page: params.page, perPage: params.perPage },
  });

export const updateRule = (http: HttpStart, id: string, payload: UpdateRuleData) =>
  http.patch<RuleResponse>(`${RULE_API_PATH}/${id}`, {
    body: JSON.stringify(payload),
  });

export const deleteRule = (http: HttpStart, id: string) =>
  http.delete<RuleResponse>(`${RULE_API_PATH}/${id}`);

export const bulkDeleteRules = (http: HttpStart, params: BulkOperationParams) =>
  http.post<BulkOperationResponse>(`${RULE_API_PATH}/_bulk_delete`, {
    body: JSON.stringify(params),
  });

export const bulkEnableRules = (http: HttpStart, params: BulkOperationParams) =>
  http.post<BulkOperationResponse>(`${RULE_API_PATH}/_bulk_enable`, {
    body: JSON.stringify(params),
  });

export const bulkDisableRules = (http: HttpStart, params: BulkOperationParams) =>
  http.post<BulkOperationResponse>(`${RULE_API_PATH}/_bulk_disable`, {
    body: JSON.stringify(params),
  });
