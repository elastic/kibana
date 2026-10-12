/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/** Attachment type identifier registered with Agent Builder. */
export const PROPOSAL_ATTACHMENT_TYPE = 'platform.proposal' as const;

/**
 * A pointer, not a copy. The proposal is the only source of truth, so both the
 * card and the agent read it at display time — anything snapshotted here would
 * still say "pending" after the analyst had decided.
 */
export const proposalAttachmentDataSchema = z.object({
  // Same bound as `proposalSchema.id`, which is what this always holds.
  proposalId: z.string().max(256),
  /**
   * Titles the card, and the one thing that has to be stored rather than read:
   * the label is rendered synchronously, so it cannot wait on the proposal.
   * Carries the proposal's own title, which `create()` always resolves.
   */
  title: z.string().max(256),
});

export type ProposalAttachmentData = z.infer<typeof proposalAttachmentDataSchema>;
