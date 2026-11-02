/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { Proposal } from '@kbn/proposals-common';
import type { ProposalPrivilegesChecker } from './check_proposal_privileges';
import type { ProposalsService } from './proposals_service';

export const DEFAULT_PROPOSAL_WAIT = { timeoutMs: 5000, intervalMs: 500 } as const;

/** What a caller says about a proposal; the conversation it belongs to is given separately. */
export interface NewProposal {
  title: string;
  comment: string;
  /** The feature the proposal is for. It routes the proposal to that feature's queue. */
  origin: string;
  impact?: string;
  confidence?: string;
  category?: string;
}

export interface CreatedProposal {
  workflowExecutionId: string;
  /** Absent when the gate workflow had not stored it by the end of the wait. */
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
 * Creates a proposal in a conversation through the gate workflow, as the user behind the request.
 * Shared by the agent tool and by in-process callers that propose without an agent run.
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
    await assertAvailable(request);
    const { title, comment, origin, impact, confidence, category } = proposal;
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
