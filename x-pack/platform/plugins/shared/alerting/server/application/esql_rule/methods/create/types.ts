/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { createEsqlRuleDataSchema } from './schemas';

type CreateEsqlRuleDataType = TypeOf<typeof createEsqlRuleDataSchema>;

export interface CreateEsqlRuleData {
  name: CreateEsqlRuleDataType['name'];
  tags: CreateEsqlRuleDataType['tags'];
  schedule: CreateEsqlRuleDataType['schedule'];
  enabled: CreateEsqlRuleDataType['enabled'];
  esql: CreateEsqlRuleDataType['esql'];
  timeField: CreateEsqlRuleDataType['timeField'];
  lookbackWindow: CreateEsqlRuleDataType['lookbackWindow'];
  groupKey: CreateEsqlRuleDataType['groupKey'];
}

export interface CreateEsqlRuleParams {
  data: CreateEsqlRuleData;
  options?: { id?: string };
}

export interface EsqlRuleResponse extends CreateEsqlRuleData {
  id: string;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}
