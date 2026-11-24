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

/** Where a proposal stands, in the terms the improvements store records. */
export type ProposalOutcome =
  | { state: 'open' }
  | { state: 'applied'; by?: string }
  | { state: 'rejected'; by?: string; reason?: string }
  | { state: 'failed'; by?: string; error?: string };

/** Proposal operations Context Engine uses to put improvements up for review. */
export interface ProposalsProvider {
  /** Resolves `false` when a proposal already exists under the id. */
  create(args: ProposalsProviderContext & { proposal: ImprovementProposal }): Promise<boolean>;
  /** Resolves `null` when no proposal exists under the id. */
  getOutcome(
    args: ProposalsProviderContext & { proposalId: string }
  ): Promise<ProposalOutcome | null>;
}
