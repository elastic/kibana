/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { investigationEvidenceSchema, MAX_EVIDENCE_TEXT_LENGTH } from '../evidence/evidence';
import { userSchema } from '../user';
import { HYPOTHESIS_STATUSES, MAX_HYPOTHESES, MAX_HYPOTHESIS_EVIDENCE } from './constants';

const MAX_ID_LENGTH = 256;
const MAX_TIMESTAMP_LENGTH = 64;

export const hypothesisStatusSchema = z.enum(HYPOTHESIS_STATUSES);
export type HypothesisStatus = z.infer<typeof hypothesisStatusSchema>;

/** One candidate cause and where the investigation stands on it. */
export const hypothesisSchema = z.object({
  /** The candidate cause under consideration. */
  candidate: z.string().min(1).max(MAX_EVIDENCE_TEXT_LENGTH),
  /** Current confidence in this hypothesis, 0 to 1. */
  confidence: z.number().min(0).max(1),
  status: hypothesisStatusSchema,
  /** Why it was dismissed or confirmed, or the current reasoning while investigating. Markdown. */
  reason: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  /** What the status rests on. */
  evidence: z.array(investigationEvidenceSchema).max(MAX_HYPOTHESIS_EVIDENCE).optional(),
});
export type Hypothesis = z.infer<typeof hypothesisSchema>;

export const hypothesesListSchema = z.array(hypothesisSchema).max(MAX_HYPOTHESES);

/** Stored hypotheses document: the full current list, replaced on every write. */
export const investigationHypothesesSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  hypotheses: hypothesesListSchema,
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: userSchema.optional(),
  updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
});
export type InvestigationHypotheses = z.infer<typeof investigationHypothesesSchema>;
