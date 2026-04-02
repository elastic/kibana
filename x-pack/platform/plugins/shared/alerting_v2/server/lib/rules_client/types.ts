/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, UpdateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';

/** Re-exported from the shared schemas package. */
export type { CreateRuleData, UpdateRuleData, RuleResponse };

export interface CreateRuleParams {
  data: CreateRuleData;
  options?: { id?: string };
}
export interface FindRulesParams {
  page?: number;
  perPage?: number;
  filter?: string;
  search?: string;
}

export interface FindRulesResponse {
  items: RuleResponse[];
  total: number;
  page: number;
  perPage: number;
}

export type BulkRulesParams =
  | { ids: string[]; filter?: undefined }
  | { filter: string; ids?: undefined };

export interface BulkOperationError {
  id: string;
  error: { message: string; statusCode: number };
}

export interface BulkOperationResponse {
  rules: RuleResponse[];
  errors: BulkOperationError[];
}
