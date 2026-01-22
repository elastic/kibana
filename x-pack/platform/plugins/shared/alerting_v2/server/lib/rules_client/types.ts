/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, UpdateRuleData } from '@kbn/alerting-rule-schemas';

export interface CreateRuleParams {
  data: CreateRuleData;
  options?: { id?: string };
}

export interface RuleResponse extends CreateRuleData {
  id: string;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export type { CreateRuleData, UpdateRuleData };

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
