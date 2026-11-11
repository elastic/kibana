/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  PROPOSAL_CATEGORY_TODO,
  proposalConfidenceSchema,
  proposalImpactSchema,
} from '@kbn/proposals-common';
import type {
  Proposal,
  ProposalConfidence,
  ProposalImpact,
  ProposalOrigin,
} from '@kbn/proposals-common';
import type { ProposalPrivilegesChecker } from './check_proposal_privileges';
import type { ProposalsService } from './proposals_service';

export const DEFAULT_PROPOSAL_WAIT = { timeoutMs: 5000, intervalMs: 500 } as const;

/** What a caller says about a proposal; the conversation it belongs to is given separately. */
export interface NewProposal {
  title: string;
  comment: string;
  /** The feature the proposal is for. It routes the proposal to that feature's queue. */
  origin: ProposalOrigin;
  impact?: string;
  confidence?: string;
  category?: string;
  /**
   * Waives the discard reason: declining the proposal is recorded without asking why. Honoured
   * on the direct path only — a proposal that runs an action is decided behind its gate, and
   * that decision is always justified.
   */
  skipDiscardReason?: boolean;
}

export interface CreatedProposal {
  /**
   * The gate that will decide the proposal. Absent for a to-do, which the
   * service writes and decides directly.
   */
  workflowExecutionId?: string;
  /**
   * Absent when the gate workflow had not stored it by the end of the wait.
   * Always present for a to-do, which is created synchronously.
   */
  proposal?: Proposal;
}

export type ProposalCreator = (args: {
  request: KibanaRequest;
  spaceId: string;
  conversationId: string;
  proposal: NewProposal;
}) => Promise<CreatedProposal>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Callers reach us with free text — an LLM's `impact`, a workflow's Liquid
 * blank — so an unrecognized value falls back to what the action's own
 * metadata, and then `create()`, decide. The gated branch passes the string
 * through to the workflow, which parses it the same way.
 */
const asImpact = (value: string | undefined): ProposalImpact | undefined =>
  proposalImpactSchema.safeParse(value).data;

const asConfidence = (value: string | undefined): ProposalConfidence | undefined =>
  proposalConfidenceSchema.safeParse(value).data;

/**
 * Creates a proposal in a conversation as the user behind the request. Shared by the agent tool
 * and by in-process callers that propose without an agent run.
 *
 * Two paths, picked by category and nothing else. A to-do is carried out by the analyst and runs
 * nothing, so it is written directly and decided by the service: a gate behind it would only park
 * an execution nobody resumes until the analyst gets to it. Everything else keeps the gate, which
 * is what records a decision that executes an action.
 */
export const createProposalCreator = ({
  getProposalsService,
  getWorkflowsApi,
  privileges,
  wait = DEFAULT_PROPOSAL_WAIT,
}: {
  getProposalsService: () => ProposalsService;
  getWorkflowsApi: () => WorkflowsServerPluginSetup['management'];
  privileges: ProposalPrivilegesChecker;
  wait?: { timeoutMs: number; intervalMs: number };
}): { create: ProposalCreator; assertAvailable: (request: KibanaRequest) => Promise<void> } => {
  const assertAvailable = async (request: KibanaRequest): Promise<void> => {
    if (!getWorkflowsApi().isWorkflowsAvailable) {
      throw new Error('Workflows are not available, so proposals cannot be created');
    }
    // In-process, so the route's `security.authz` does not apply.
    await privileges.assertCanManage(request);
  };

  const waitForProposal = async (workflowExecutionId: string, spaceId: string) => {
    const deadline = Date.now() + wait.timeoutMs;
    do {
      const proposal = await getProposalsService().findByWorkflowExecutionId(
        workflowExecutionId,
        spaceId
      );
      if (proposal) {
        return proposal;
      }
      await sleep(wait.intervalMs);
    } while (Date.now() < deadline);
    return undefined;
  };

  const create: ProposalCreator = async ({ request, spaceId, conversationId, proposal }) => {
    const { title, comment, origin, impact, confidence, category, skipDiscardReason } = proposal;

    if (category === PROPOSAL_CATEGORY_TODO) {
      // Workflows are not consulted at all here, so a to-do needs only
      // `manage_proposals` — the privilege the gated branch checks as well.
      await privileges.assertCanManage(request);
      const created = await getProposalsService().create(
        {
          gate: 'none',
          conversationId,
          title,
          comment,
          origin,
          category: PROPOSAL_CATEGORY_TODO,
          ...(skipDiscardReason !== undefined && { skipDiscardReason }),
          ...(asImpact(impact) !== undefined && { impact: asImpact(impact) }),
          confidence: asConfidence(confidence) ?? 'medium',
        },
        { spaceId, request }
      );
      return { proposal: created };
    }

    await assertAvailable(request);
    const { workflowExecutionId } = await getWorkflowsApi().executeWorkflow({
      workflowId: CREATE_PROPOSAL_WORKFLOW_ID,
      spaceId,
      request,
      inputs: {
        conversationId,
        title,
        comment,
        origin,
        ...(impact !== undefined && { impact }),
        ...(confidence !== undefined && { confidence }),
        ...(category !== undefined && { category }),
      },
      // The gate parks on the analyst's decision; only its start is awaited.
      waitForCompletion: false,
    });
    return { workflowExecutionId, proposal: await waitForProposal(workflowExecutionId, spaceId) };
  };

  return { create, assertAvailable };
};
