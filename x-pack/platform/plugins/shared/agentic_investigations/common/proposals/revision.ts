/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  boundedActionInput,
  MAX_COMMENT_LENGTH,
  proposalConfidenceSchema,
  proposalImpactSchema,
  proposalStatusSchema,
} from './proposal';

/**
 * Fields an analyst may override when revising a proposal. Deliberately
 * excludes `actionWorkflowId`: swapping the action wholesale is a new
 * proposal, not a revision of this one, because the original `actionInput`
 * was validated against the original action's schema and would silently
 * become meaningless.
 *
 * `expiresAt` and `createdAt` are also excluded, both inherited unchanged
 * from the proposal being revised rather than tunable — see
 * `ProposalsService.revise`. The deadline belongs to the analyst, not the
 * attempt: resetting it on revision would let a near-expired proposal be
 * extended indefinitely by repeated revisions (issue #19289, "Previously
 * open, now decided").
 */
export const reviseProposalRequestSchema = z.object({
  /** Updated rationale, rendered as markdown. */
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
  actionInput: boundedActionInput.optional(),
  impact: proposalImpactSchema.optional(),
  confidence: proposalConfidenceSchema.optional(),
});
export type ReviseProposalRequest = z.infer<typeof reviseProposalRequestSchema>;

/**
 * Matches the Agent Builder tool's output contract from
 * elastic/security-team#19289 ("proposalId, revision, status") — the route
 * response carries the same three fields.
 */
export const reviseProposalResponseSchema = z.object({
  proposalId: z.string(),
  revision: z.number().int().min(1),
  status: proposalStatusSchema,
});
export type ReviseProposalResponse = z.infer<typeof reviseProposalResponseSchema>;
