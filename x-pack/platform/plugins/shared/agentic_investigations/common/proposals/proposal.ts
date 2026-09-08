/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * A proposal terminates at `approved` when it carries no action; only
 * action-bearing proposals reach the execution states.
 */
export const proposalStatusSchema = z.enum([
  'pending',
  'approved',
  'executing',
  'succeeded',
  'failed',
  'dismissed',
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const proposalImpactSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ProposalImpact = z.infer<typeof proposalImpactSchema>;

export const proposalConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type ProposalConfidence = z.infer<typeof proposalConfidenceSchema>;

export const proposalOriginSchema = z.enum(['worker', 'analyst']);
export type ProposalOrigin = z.infer<typeof proposalOriginSchema>;

/**
 * Grouping axis for the decision queue. Kept as a plain string in storage so a
 * solution can extend the vocabulary without a mapping change; the enum is the
 * shared baseline.
 */
export const proposalCategorySchema = z.enum(['contain', 'escalate', 'investigate', 'tune']);
export type ProposalCategory = z.infer<typeof proposalCategorySchema>;

export const dismissReasonSchema = z.enum([
  'wrong',
  'duplicate',
  'insufficient_evidence',
  'low_value',
  'out_of_scope',
  'already_handled',
  'other',
]);
export type DismissReason = z.infer<typeof dismissReasonSchema>;

/**
 * Metadata an action workflow declares about itself under
 * `consts.actionMetadata`, resolved on read rather than copied onto proposals.
 */
export const actionMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: proposalCategorySchema,
  impact: proposalImpactSchema.optional(),
  reversible: z.boolean().optional(),
  approvalPolicy: z.enum(['always-gate', 'autonomy-dependent']).optional(),
});
export type ActionMetadata = z.infer<typeof actionMetadataSchema>;

export const proposalSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  /** Conversation this proposal belongs to. The reverse link lives on the conversation. */
  conversationId: z.string(),
  /** Explains what is being proposed; the only content a non-action proposal carries. */
  comment: z.string().optional(),

  /**
   * Managed action workflow this proposal would execute. Absent for
   * non-action proposals. Immutable: a different action is a different
   * proposal.
   */
  actionWorkflowId: z.string().optional(),
  /** Inputs for the action workflow. Frozen once the proposal is decided. */
  actionInput: z.record(z.string(), z.unknown()).optional(),

  status: proposalStatusSchema,
  /** Snapshotted from the triggering context at creation; never re-scored. */
  impact: proposalImpactSchema,
  confidence: proposalConfidenceSchema,
  /** Resolved from the action workflow's metadata at creation. */
  category: z.string(),
  /** Typed entity references (`host.name:web-01`) used by the queue's entity filter. */
  targetEntities: z.array(z.string()).default([]),
  origin: proposalOriginSchema,
  /** Decision deadline, evaluated on read rather than swept into a status. */
  expiresAt: z.string().optional(),

  decidedBy: z.string().optional(),
  decidedAt: z.string().optional(),
  dismissReason: dismissReasonSchema.optional(),
  rationale: z.string().optional(),
  executionError: z.string().optional(),

  /** Gating execution to resume. Absent when no workflow is waiting. */
  workflowExecutionId: z.string().optional(),
  /** Set when this proposal replaces a dismissed one. */
  supersedesProposalId: z.string().optional(),

  createdAt: z.string(),
  createdBy: z.string().optional(),
});
export type Proposal = z.infer<typeof proposalSchema>;

/** Catalog metadata resolved on read, plus the expiry evaluated at request time. */
export interface ProposalWithMetadata extends Proposal {
  action?: ActionMetadata;
  expired: boolean;
}

export const createProposalRequestSchema = z.object({
  conversationId: z.string(),
  comment: z.string().optional(),
  actionWorkflowId: z.string().optional(),
  actionInput: z.record(z.string(), z.unknown()).optional(),
  impact: proposalImpactSchema.default('low'),
  confidence: proposalConfidenceSchema.default('medium'),
  targetEntities: z.array(z.string()).optional(),
  origin: proposalOriginSchema.default('worker'),
  expiresAt: z.string().optional(),
  workflowExecutionId: z.string().optional(),
  supersedesProposalId: z.string().optional(),
});
export type CreateProposalRequest = z.infer<typeof createProposalRequestSchema>;

export const approveProposalRequestSchema = z.object({
  /**
   * The action input the approver was shown. Rejected with a conflict when it
   * no longer matches the record, so an approval can never apply to values the
   * decider never saw.
   */
  actionInput: z.record(z.string(), z.unknown()).optional(),
  rationale: z.string().optional(),
});
export type ApproveProposalRequest = z.infer<typeof approveProposalRequestSchema>;

export const dismissProposalRequestSchema = z.object({
  dismissReason: dismissReasonSchema,
  rationale: z.string().optional(),
});
export type DismissProposalRequest = z.infer<typeof dismissProposalRequestSchema>;

export const listProposalsQuerySchema = z.object({
  status: proposalStatusSchema.optional(),
  conversationId: z.string().optional(),
  targetEntity: z.string().optional(),
  size: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;

export interface ListProposalsResponse {
  proposals: ProposalWithMetadata[];
  total: number;
}

/** Terminal states: a decided or executed proposal can no longer be acted on. */
export const isDecided = (status: ProposalStatus): boolean => status !== 'pending';

export const isExpired = (proposal: Pick<Proposal, 'expiresAt'>, now = Date.now()): boolean => {
  if (!proposal.expiresAt) {
    return false;
  }
  const deadline = Date.parse(proposal.expiresAt);
  return Number.isFinite(deadline) && deadline <= now;
};
