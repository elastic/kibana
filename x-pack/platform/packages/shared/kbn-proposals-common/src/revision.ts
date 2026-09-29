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
 * Fields an analyst may override when revising. Excludes `actionWorkflowId`
 * (the existing `actionInput` was validated against the original action's
 * schema) and `expiresAt`/`createdAt`, so repeated revisions cannot extend a
 * near-expired proposal indefinitely.
 */
export const reviseProposalRequestSchema = z.object({
  /** Updated rationale, rendered as markdown. */
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
  actionInput: boundedActionInput.optional(),
  impact: proposalImpactSchema.optional(),
  confidence: proposalConfidenceSchema.optional(),
});
export type ReviseProposalRequest = z.infer<typeof reviseProposalRequestSchema>;

/** Shared by the route response and the Agent Builder tool's output contract. */
export const reviseProposalResponseSchema = z.object({
  proposalId: z.string(),
  revision: z.number().int().min(1),
  status: proposalStatusSchema,
});
export type ReviseProposalResponse = z.infer<typeof reviseProposalResponseSchema>;
