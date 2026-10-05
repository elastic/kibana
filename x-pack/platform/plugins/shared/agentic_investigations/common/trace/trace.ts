/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  investigationEvidenceSchema,
  MAX_EVIDENCE_SHORT_TEXT_LENGTH,
  MAX_EVIDENCE_TEXT_LENGTH,
} from '../evidence/evidence';
import { userSchema } from '../user';
import { MAX_TRACE_STEPS, TRACE_STEP_TYPES } from './constants';

const MAX_ID_LENGTH = 256;
const MAX_NODE_ID_LENGTH = 128;
const MAX_TIMESTAMP_LENGTH = 64;

export const traceStepTypeSchema = z.enum(TRACE_STEP_TYPES);
export type TraceStepType = z.infer<typeof traceStepTypeSchema>;

/** One step on the route the investigation took, in the order it took them. */
export const traceStepSchema = z.object({
  type: traceStepTypeSchema,
  /** What was investigated, or the question decided, in one line. */
  label: z.string().min(1).max(MAX_EVIDENCE_SHORT_TEXT_LENGTH),
  /** How it was investigated: the query, command, or source read. Markdown. */
  method: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  /** What it showed. Markdown. */
  finding: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  /** The branch it led to, like a decision tree edge label ("errors only on v2"). */
  outcome: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH).optional(),
  /** The id of the node in the decision tree that guided this step, when one did. */
  decision_tree_node: z.string().max(MAX_NODE_ID_LENGTH).optional(),
  evidence: investigationEvidenceSchema.optional(),
});
export type TraceStep = z.infer<typeof traceStepSchema>;

export const traceStepsSchema = z.array(traceStepSchema).max(MAX_TRACE_STEPS);

/** Stored trace document: the full route so far, replaced on every write. */
export const investigationTraceSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  steps: traceStepsSchema,
  /** The decision tree file the investigation followed, when one matched its symptom. */
  decisionTree: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH).optional(),
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: userSchema.optional(),
  updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
});
export type InvestigationTrace = z.infer<typeof investigationTraceSchema>;
