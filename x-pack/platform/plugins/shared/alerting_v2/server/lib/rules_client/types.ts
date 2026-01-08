/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { createRuleDataSchema, updateRuleDataSchema } from './schemas';

export type CreateRuleData = TypeOf<typeof createRuleDataSchema>;

export interface CreateRuleParams {
  data: CreateRuleData;
  options?: { id?: string };
}

export interface RuleResponse extends CreateRuleData {
  id: string;
  scheduledTaskId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export type UpdateRuleData = TypeOf<typeof updateRuleDataSchema>;
