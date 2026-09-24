/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { dismissReasonSchema } from '@kbn/proposals-common';

export const setInvestigationStatusRequestSchema = z.object({
  status: z.enum(['open', 'closed']),
  dismiss_reason: dismissReasonSchema.optional(),
  rationale: z.string().max(4096).optional(),
});

export type SetInvestigationStatusRequest = z.infer<typeof setInvestigationStatusRequestSchema>;

export interface SetInvestigationStatusResponse {
  conversation_id: string;
  status: string;
  dismissed_proposal_ids: string[];
  failed_proposal_ids: string[];
}

export interface InvestigationClosePreviewResponse {
  pending_proposal_count: number;
}

export const setEscalationStatusRequestSchema = z.object({
  status: z.enum(['open', 'closed']),
  dismiss_reason: dismissReasonSchema.optional(),
  rationale: z.string().max(4096).optional(),
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
  }>;
}
