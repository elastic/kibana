/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { investigationEvidenceSchema, MAX_EVIDENCE_TEXT_LENGTH } from '../evidence/evidence';
import { userSchema } from '../user';
import {
  HYPOTHESIS_STATUSES,
  MAX_HYPOTHESES,
  MAX_HYPOTHESIS_CHECKS,
  MAX_HYPOTHESIS_EVIDENCE,
  MAX_HYPOTHESIS_UNKNOWNS,
} from './constants';

const MAX_ID_LENGTH = 256;
const MAX_TIMESTAMP_LENGTH = 64;

export const hypothesisStatusSchema = z.enum(HYPOTHESIS_STATUSES);
export type HypothesisStatus = z.infer<typeof hypothesisStatusSchema>;

export const HYPOTHESIS_CHECK_OUTCOMES = ['supported', 'contradicted', 'not_tested'] as const;
export const hypothesisCheckOutcomeSchema = z.enum(HYPOTHESIS_CHECK_OUTCOMES);
export type HypothesisCheckOutcome = z.infer<typeof hypothesisCheckOutcomeSchema>;

const MAX_HYPOTHESIS_LINE_LENGTH = 400;

/**
 * A blind spot: what could not be seen. A bare string is one saved before the parts below
 * existed; it is shown as the `text` alone.
 */
export const hypothesisUnknownSchema = z.union([
  z.string().min(1).max(MAX_HYPOTHESIS_LINE_LENGTH),
  z.object({
    /** What is unknown, in one line. */
    text: z.string().min(1).max(MAX_HYPOTHESIS_LINE_LENGTH),
    /** How it limits the confidence in this hypothesis. */
    effect: z.string().max(MAX_HYPOTHESIS_LINE_LENGTH).optional(),
    /** Where to look for the answer. */
    where_to_look: z.string().max(MAX_HYPOTHESIS_LINE_LENGTH).optional(),
    /** How to close the gap. */
    how_to_close: z.string().max(MAX_HYPOTHESIS_LINE_LENGTH).optional(),
  }),
]);
export type HypothesisUnknown = z.infer<typeof hypothesisUnknownSchema>;

/** One test of a hypothesis: what was expected if it is the cause, and what the data showed. */
export const hypothesisCheckSchema = z.object({
  /** What we expected to see if this is the cause, in one line. */
  expected: z.string().min(1).max(MAX_HYPOTHESIS_LINE_LENGTH),
  /** What the data showed, in one line; or why it was not tested. */
  found: z.string().min(1).max(MAX_HYPOTHESIS_LINE_LENGTH),
  /** Whether the result supports the hypothesis, contradicts it, or the check was not run. */
  outcome: hypothesisCheckOutcomeSchema,
  /**
   * The ids, thresholds, counts and windows behind the row, in Markdown, shown when it opens. The
   * chart and the query come from the event the row's `found` text links to.
   */
  detail: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
});
export type HypothesisCheck = z.infer<typeof hypothesisCheckSchema>;

/** One candidate cause and where the investigation stands on it. */
export const hypothesisSchema = z.object({
  /** The candidate cause under consideration. */
  candidate: z.string().min(1).max(MAX_EVIDENCE_TEXT_LENGTH),
  /** Current confidence in this hypothesis, 0 to 1. */
  confidence: z.number().min(0).max(1),
  status: hypothesisStatusSchema,
  /** Why it was dismissed or confirmed, or the current reasoning while investigating. Markdown. */
  reason: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  /** The verdict and why, in one sentence the reader can take in at a glance. */
  why: z.string().max(MAX_HYPOTHESIS_LINE_LENGTH).optional(),
  /** How it was tested, one row per check. */
  checks: z.array(hypothesisCheckSchema).max(MAX_HYPOTHESIS_CHECKS).optional(),
  /** What the agent could not see, each with how it affects confidence or where to look. */
  unknowns: z.array(hypothesisUnknownSchema).max(MAX_HYPOTHESIS_UNKNOWNS).optional(),
  /** One line of caveat for the chart, such as a partial last bucket. */
  chart_note: z.string().max(MAX_HYPOTHESIS_LINE_LENGTH).optional(),
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
