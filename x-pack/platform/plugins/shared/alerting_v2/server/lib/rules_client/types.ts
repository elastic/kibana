/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, UpdateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';

export interface CreateRuleParams {
  data: CreateRuleData;
  options?: { id?: string };
}

export type { CreateRuleData, UpdateRuleData, RuleResponse };

export interface FindRulesParams {
  page?: number;
  perPage?: number;
}

export interface FindRulesResponse {
  items: RuleResponse[];
  total: number;
  page: number;
  perPage: number;
}
