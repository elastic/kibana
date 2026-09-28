/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { dismissReasonSchema } from '@kbn/proposals-common';

const MAX_EXPECTED_IDS = 1000;
const MAX_ID_LENGTH = 256;

export const setInvestigationStatusRequestSchema = z.object({
  status: z.enum(['open', 'closed']),
  dismiss_reason: dismissReasonSchema.optional(),
  rationale: z.string().max(4096).optional(),
  /**
   * IDs of pending proposals the client saw when it rendered the close confirmation.
   * When provided, the server rejects the close with 409 if any currently pending proposal
   * was not in this list (i.e. it arrived after the user opened the dialog). This prevents
   * dismissing proposals the user never reviewed.
   */
  expected_proposal_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_EXPECTED_IDS).optional(),
});

export type SetInvestigationStatusRequest = z.infer<typeof setInvestigationStatusRequestSchema>;

export interface SetInvestigationStatusResponse {
  conversation_id: string;
  status: string;
  dismissed_proposal_ids: string[];
  failed_proposal_ids: string[];
}

/** A pending proposal summarised for the close-preview response. */
export interface ClosePreviewProposal {
  id: string;
  /** Human-readable name, derived from the action's name, then the workflow ID, or null. */
  action_name: string | null;
}

export interface InvestigationClosePreviewResponse {
  pending_proposal_count: number;
  pending_proposals: ClosePreviewProposal[];
}

export const setEscalationStatusRequestSchema = z.object({
  status: z.enum(['open', 'closed']),
  dismiss_reason: dismissReasonSchema.optional(),
  rationale: z.string().max(4096).optional(),
  /**
   * IDs of the open linked investigations the client saw. Rejects with 409 when a
   * currently-open investigation was not in this list.
   */
  expected_investigation_ids: z
    .array(z.string().max(MAX_ID_LENGTH))
    .max(MAX_EXPECTED_IDS)
    .optional(),
  /**
   * IDs of pending proposals (across all linked investigations) the client saw.
   * Rejects with 409 when any currently-pending proposal was not in this list.
   */
  expected_proposal_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_EXPECTED_IDS).optional(),
});

export type SetEscalationStatusRequest = z.infer<typeof setEscalationStatusRequestSchema>;

export interface SetEscalationStatusResponse {
  escalation_id: string;
  status: string;
  closed_investigation_ids: string[];
  skipped_investigation_ids: string[];
  dismissed_proposal_ids: string[];
  failed_proposal_ids: string[];
}

export interface EscalationClosePreviewResponse {
  open_investigations: Array<{
    id: string;
    title: string;
    pending_proposal_count: number;
    pending_proposals: ClosePreviewProposal[];
  }>;
  /**
   * IDs of linked investigations that could not be resolved (deleted or inaccessible).
   * When non-empty, closing the escalation is blocked until the links are removed.
   */
  unavailable_investigation_ids: string[];
}
