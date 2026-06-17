/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { causeKiSchema, evidenceSchema } from '../common_schemas';

export const investigationInputSchema = z.object({
  event_id: z.string(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  impact: z.string(),
  stream_names: z.array(z.string()),
  cause_kis: z.array(causeKiSchema),
  evidences: z.array(evidenceSchema),
});

export type InvestigationInput = z.infer<typeof investigationInputSchema>;

const alternativeRuledOutSchema = z.object({
  candidate: z.string(),
  reason: z.string(),
});

export type AlternativeRuledOut = z.infer<typeof alternativeRuledOutSchema>;

export const investigationResultSchema = z.object({
  root_cause: z.string(),
  confidence: z.number().min(0).max(1),
  evidence_summary: z.string(),
  mechanism: z.string(),
  alternatives_ruled_out: z.array(alternativeRuledOutSchema),
  gaps_found: z.array(z.string()),
});

export type InvestigationResult = z.infer<typeof investigationResultSchema>;
