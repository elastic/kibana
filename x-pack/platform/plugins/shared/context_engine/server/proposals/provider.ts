/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/** Space and user request a proposals operation runs under. */
export interface ProposalsProviderContext {
  spaceId: string;
  request: KibanaRequest;
}

/** A change for a person to approve, which runs `actionWorkflowId` as the approver. */
export interface ImprovementProposal {
  /** Deterministic, so a re-run proposing the same change does not create a second proposal. */
  id: string;
  /** What the proposal is listed under; proposals carry no other subject. */
  conversationId: string;
  title: string;
  comment: string;
  actionWorkflowId: string;
  actionInput: Record<string, unknown>;
  impact?: string;
  confidence?: string;
}

export type ProposalHistoryStatus =
  | 'pending'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'no_action'
  | 'superseded';

/** A proposal as an analysis run reads it: what was proposed and what became of it. */
export interface ProposalHistoryItem {
  id: string;
  title: string;
  actionWorkflowId?: string;
  actionInput?: Record<string, unknown>;
  status: ProposalHistoryStatus;
  /** The reviewer's reason for dismissing it, in their words where they gave any. */
  reason?: string;
  /** Why the approved action failed. */
  error?: string;
}

export interface ProposalHistory {
  /** Most recent first. */
  items: ProposalHistoryItem[];
  /** Every proposal under the anchor, which may be more than `items`. */
  total: number;
}

/** Proposal operations Context Engine uses to put improvements up for review. */
export interface ProposalsProvider {
  /** Resolves `false` when a proposal already exists under the id. */
  create(args: ProposalsProviderContext & { proposal: ImprovementProposal }): Promise<boolean>;
  /** The proposals listed under a conversation anchor, newest first. */
  list(
    args: ProposalsProviderContext & { conversationId: string; size: number }
  ): Promise<ProposalHistory>;
}
