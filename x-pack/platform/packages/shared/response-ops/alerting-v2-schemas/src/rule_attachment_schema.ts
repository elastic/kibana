/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { optionalWithDescription as opt } from './common';
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
const { shape } = ruleResponseSchema;

export const ruleAttachmentDataSchema = ruleResponseSchema.extend({
  id: opt(shape.id),
  enabled: opt(shape.enabled),
  createdBy: opt(shape.createdBy),
  createdAt: opt(shape.createdAt),
  updatedBy: opt(shape.updatedBy),
  updatedAt: opt(shape.updatedAt),
});

export type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;
