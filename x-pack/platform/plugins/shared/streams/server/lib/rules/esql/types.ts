/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams, RuleTypeState } from '@kbn/alerting-plugin/common';
import { z } from '@kbn/zod';

export interface EsqlRuleInstanceState extends RuleTypeState {
  previousOriginalDocumentIds?: string[];
}

export const esqlRuleInstanceState: z.Schema<EsqlRuleInstanceState> = z.object({
  previousOriginalDocumentIds: z.string().array().optional(),
});

export interface EsqlRuleParams extends RuleTypeParams {
  query: string;
  timestampField: string;
}

export const esqlRuleParams: z.Schema<EsqlRuleParams> = z.object({
  query: z.string(),
  timestampField: z.string(),
});
