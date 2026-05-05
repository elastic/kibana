/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ruleResponseSchema } from './rule_data_schema';

export const RULE_ATTACHMENT_TYPE = 'rule' as const;
export const RULE_SML_TYPE = 'alerting_v2_rule' as const;

/**
 * Data stored inside a rule attachment.
 *
 * Server-generated fields (id, enabled, createdBy, createdAt, updatedBy, updatedAt)
 * are optional so that the same schema covers both:
 *   - proposed rules (by-value, not yet saved — no id or audit fields)
 *   - saved rules    (by-reference, linked via attachment.origin = rule saved object id)
 */
export const ruleAttachmentDataSchema = ruleResponseSchema.extend({
  id: z.string().optional(),
  enabled: z.boolean().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedBy: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
});

export type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;
