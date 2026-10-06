/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
export declare const setInvestigationStatusRequestSchema: z.ZodObject<
  {
    status: z.ZodEnum<{
      closed: 'closed';
      open: 'open';
    }>;
    dismiss_reason: z.ZodOptional<
      z.ZodEnum<{
        duplicate: 'duplicate';
        false_positive: 'false_positive';
        handled_elsewhere: 'handled_elsewhere';
        no_reason: 'no_reason';
        other: 'other';
        risk_accepted: 'risk_accepted';
      }>
    >;
    rationale: z.ZodOptional<z.ZodString>;
    expected_proposal_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
>;
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
export declare const setEscalationStatusRequestSchema: z.ZodObject<
  {
    status: z.ZodEnum<{
      closed: 'closed';
      open: 'open';
    }>;
    dismiss_reason: z.ZodOptional<
      z.ZodEnum<{
        duplicate: 'duplicate';
        false_positive: 'false_positive';
        handled_elsewhere: 'handled_elsewhere';
        no_reason: 'no_reason';
        other: 'other';
        risk_accepted: 'risk_accepted';
      }>
    >;
    rationale: z.ZodOptional<z.ZodString>;
    expected_investigation_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    expected_proposal_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
>;
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
