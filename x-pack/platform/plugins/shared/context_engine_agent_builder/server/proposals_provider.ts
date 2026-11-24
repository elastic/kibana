/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalsProvider } from '@kbn/context-engine-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ProposalAlreadyExistsError, ProposalNotFoundError } from '@kbn/proposals-plugin/server';

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

  async getOutcome({ proposalId, spaceId, request }) {
    const { getProposalsService } = await getProposals();
    let proposal;
    try {
      proposal = await getProposalsService().get(proposalId, spaceId, request);
    } catch (error) {
      if (error instanceof ProposalNotFoundError) {
        return null;
      }
      throw error;
    }

    const by = proposal.decidedBy?.username ?? undefined;
    switch (proposal.status) {
      case 'succeeded':
        return { state: 'applied', ...(by ? { by } : {}) };
      case 'failed':
        return {
          state: 'failed',
          ...(by ? { by } : {}),
          ...(proposal.executionError ? { error: proposal.executionError } : {}),
        };
      case 'no_action':
        return {
          state: 'rejected',
          ...(by ? { by } : {}),
          ...(proposal.rationale ? { reason: proposal.rationale } : {}),
        };
      default:
        return { state: 'open' };
    }
  },
});
