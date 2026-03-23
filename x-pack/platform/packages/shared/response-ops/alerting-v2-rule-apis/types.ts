/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';

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
