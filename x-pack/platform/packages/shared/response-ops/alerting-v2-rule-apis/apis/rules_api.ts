/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleResponse, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from '../constants';
import type { FindRulesResponse, BulkOperationParams, BulkOperationResponse } from '../types';

export const listRules = (
  http: HttpStart,
  params: { page?: number; perPage?: number; search?: string }
) =>
  http.get<FindRulesResponse>(INTERNAL_ALERTING_V2_RULE_API_PATH, {
    query: { page: params.page, perPage: params.perPage, search: params.search },
  });

export const updateRule = (http: HttpStart, id: string, payload: UpdateRuleData) =>
  http.patch<RuleResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`, {
    body: JSON.stringify(payload),
  });

export const deleteRule = (http: HttpStart, id: string) =>
  http.delete<RuleResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/${id}`);

export const bulkDeleteRules = (http: HttpStart, params: BulkOperationParams) =>
  http.post<BulkOperationResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/_bulk_delete`, {
    body: JSON.stringify(params),
  });

export const bulkEnableRules = (http: HttpStart, params: BulkOperationParams) =>
  http.post<BulkOperationResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/_bulk_enable`, {
    body: JSON.stringify(params),
  });

export const bulkDisableRules = (http: HttpStart, params: BulkOperationParams) =>
  http.post<BulkOperationResponse>(`${INTERNAL_ALERTING_V2_RULE_API_PATH}/_bulk_disable`, {
    body: JSON.stringify(params),
  });
