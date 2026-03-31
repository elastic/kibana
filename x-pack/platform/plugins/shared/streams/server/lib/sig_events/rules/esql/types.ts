/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams, RuleTypeState } from '@kbn/alerting-plugin/common';
import { type QueryType, queryTypeSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';

export interface EsqlRuleInstanceState extends RuleTypeState {
  previousOriginalDocumentIds?: string[];
  previousFiringIds?: string[];
}

export const esqlRuleInstanceState = z.object({
  previousOriginalDocumentIds: z.string().array().optional(),
  previousFiringIds: z.string().array().optional(),
}) satisfies z.Schema<EsqlRuleInstanceState>;

export interface EsqlRuleParams extends RuleTypeParams {
  query: string;
  timestampField: string;
  type?: QueryType;
  lookbackMinutes?: number;
}

export const esqlRuleParams = z.object({
  query: z.string(),
  timestampField: z.string(),
  type: queryTypeSchema.optional(),
  lookbackMinutes: z.number().optional(),
}) satisfies z.Schema<EsqlRuleParams>;
