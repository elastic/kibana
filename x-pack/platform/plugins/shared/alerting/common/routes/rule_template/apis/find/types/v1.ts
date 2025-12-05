/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { findRuleTemplatesRequestQuerySchema } from '../schemas/v1';
import type { RuleTemplateResponseV1 } from '../../../response';

export type FindRuleTemplatesRequestQuery = TypeOf<typeof findRuleTemplatesRequestQuerySchema>;

export interface FindRuleTemplatesResponse {
  page: number;
  per_page: number;
  total: number;
  data: RuleTemplateResponseV1[];
}
