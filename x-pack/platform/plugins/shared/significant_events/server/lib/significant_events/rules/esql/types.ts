/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams, RuleTypeState } from '@kbn/alerting-plugin/common';
import { z } from '@kbn/zod/v4';
import { MAX_ID_LENGTH, MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';

export interface EsqlRuleInstanceState extends RuleTypeState {
  previousOriginalDocumentIds?: string[];
}

export const esqlRuleInstanceState = z.object({
  previousOriginalDocumentIds: z.string().max(MAX_ID_LENGTH).array().optional(),
}) satisfies z.Schema<EsqlRuleInstanceState>;

export interface EsqlRuleParams extends RuleTypeParams {
  query: string;
  timestampField: string;
}

export const esqlRuleParams = z.object({
  query: z.string().max(MAX_TEXT_LENGTH),
  timestampField: z.string().max(MAX_ID_LENGTH),
}) satisfies z.Schema<EsqlRuleParams>;
