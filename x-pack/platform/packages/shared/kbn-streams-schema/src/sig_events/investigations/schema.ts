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

const hypothesisProposalSchema = z.object({
  id: z.string(),
  statement: z.string(),
  prior_confidence: z.number().min(0).max(1),
  suggested_queries: z.array(z.string()).max(4),
});

export type HypothesisProposal = z.infer<typeof hypothesisProposalSchema>;

export const contextOutputSchema = z.object({
  context_summary: z.string(),
  memory_context: z.string(),
  known_gaps: z.array(z.string()),
  hypotheses: z.array(hypothesisProposalSchema).min(1).max(5),
});

export type ContextOutput = z.infer<typeof contextOutputSchema>;

const evidenceItemSchema = z.object({
  source: z.enum(['esql', 'memory', 'ki', 'mcp', 'none']),
  description: z.string(),
  relevance: z.enum(['supporting', 'refuting', 'neutral', 'unreachable']),
});

export const gatherOutputSchema = z.object({
  hypothesis_id: z.string(),
  evidence: z.array(evidenceItemSchema).max(12),
  gaps_found: z.array(z.string()),
  gather_summary: z.string(),
});

export type GatherOutput = z.infer<typeof gatherOutputSchema>;

export const reviewOutputSchema = z.object({
  hypothesis_id: z.string(),
  decision: z.enum(['forward', 'discard']),
  discard_reason: z.string().optional(),
  verdict: z.enum(['supported', 'refuted', 'inconclusive', 'out_of_reach']),
  posterior_confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type ReviewOutput = z.infer<typeof reviewOutputSchema>;

const remediationOptionSchema = z.object({
  rank: z.number().int().min(1),
  action: z.string(),
  rationale: z.string(),
  risk_level: z.enum(['low', 'medium', 'high']),
  prerequisites: z.array(z.string()).optional(),
});

const rankedHypothesisSchema = z.object({
  rank: z.number().int().min(1),
  hypothesis_id: z.string(),
  statement: z.string(),
  verdict: z.enum(['supported', 'refuted', 'inconclusive', 'out_of_reach']),
  prior_confidence: z.number().min(0).max(1),
  posterior_confidence: z.number().min(0).max(1),
  evidence_summary: z.string(),
});

const discardedHypothesisSchema = z.object({
  hypothesis_id: z.string(),
  statement: z.string(),
  discard_reason: z.string(),
});

export const investigationResultSchema = z.object({
  root_cause: z.string(),
  confidence: z.number().min(0).max(1),
  impact: z.string(),
  ranked_hypotheses: z.array(rankedHypothesisSchema),
  discarded_hypotheses: z.array(discardedHypothesisSchema),
  remediation_options: z.array(remediationOptionSchema),
  gaps_found: z.array(z.string()),
  investigation_complete: z.boolean(),
  memory_pages_written: z.array(z.string()),
});

export type InvestigationResult = z.infer<typeof investigationResultSchema>;
