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
} from './proposal';

/**
 * Fields an analyst may override when revising a proposal. Deliberately
 * excludes `actionWorkflowId`: swapping the action wholesale is a new
 * proposal, not a revision of this one, because the original `actionInput`
 * was validated against the original action's schema and would silently
 * become meaningless.
 *
 * `expiresAt` is excluded for the same reason the failure-recovery clone
 * excludes it — a revision must not be usable to extend a near-expired
 * deadline indefinitely. Per issue elastic/security-team#19289 (rewritten
 * 2026-09-17 19:45 CEST), both `expiresAt` and `createdAt` instead INHERIT
 * unchanged from the proposal being revised — see `ProposalsService.revise`.
 *
 * PROVISIONAL: the issue's author flagged in Slack, six minutes after writing
 * that inheritance rule, that he is personally still unsure about it and
 * wants to sync before it's final (as of 2026-09-17, unresolved). Implemented
 * per the issue's current written word; do not treat this as settled.
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
  status: z.string(),
});
export type ReviseProposalResponse = z.infer<typeof reviseProposalResponseSchema>;
