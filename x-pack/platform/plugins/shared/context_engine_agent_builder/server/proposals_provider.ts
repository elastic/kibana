/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalsProvider } from '@kbn/context-engine-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ProposalAlreadyExistsError } from '@kbn/proposals-plugin/server';

/**
 * Creates a Context Engine proposals provider backed by the proposals plugin. An improvement is
 * put up as a gateless proposal, so nothing is parked on it: approving it runs its action
 * workflow as the approver.
 */
export const createProposalsProvider = (
  getProposals: () => Promise<ProposalsPluginStart>
): ProposalsProvider => ({
  async create({ proposal, spaceId, request }) {
    const { createProposal } = await getProposals();
    try {
      await createProposal({
        request,
        spaceId,
        conversationId: proposal.conversationId,
        proposal: {
          gate: 'none',
          origin: 'context_engine',
          id: proposal.id,
          title: proposal.title,
          comment: proposal.comment,
          actionWorkflowId: proposal.actionWorkflowId,
          actionInput: proposal.actionInput,
          ...(proposal.impact !== undefined && { impact: proposal.impact }),
          ...(proposal.confidence !== undefined && { confidence: proposal.confidence }),
        },
      });
      return true;
    } catch (error) {
      if (error instanceof ProposalAlreadyExistsError) {
        return false;
      }
      throw error;
    }
  },

  async list({ conversationId, size, spaceId, request }) {
    const { getProposalsService } = await getProposals();
    const { proposals, total } = await getProposalsService().list(
      {
        origin: 'context_engine',
        conversationId,
        order: 'newest',
        excludeSuperseded: false,
        excludeExpired: false,
        size,
        from: 0,
      },
      spaceId,
      request
    );

    return {
      total,
      items: proposals.map((proposal) => {
        const reason = [
          proposal.dismissReason !== 'no_reason' ? proposal.dismissReason : undefined,
          proposal.rationale,
        ]
          .filter(Boolean)
          .join(': ');
        return {
          id: proposal.id,
          title: proposal.title,
          actionWorkflowId: proposal.actionWorkflowId,
          actionInput: proposal.actionInput,
          status: proposal.status,
          ...(reason ? { reason } : {}),
          ...(proposal.executionError ? { error: proposal.executionError } : {}),
        };
      }),
    };
  },
});
