/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
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
  ProposalGate,
  ProposalImpact,
  ProposalOrigin,
} from '@kbn/proposals-common';
import type { ProposalPrivilegesChecker } from './check_proposal_privileges';
import type { ProposalsService } from './proposals_service';
import { ProposalInvalidActionInputError, ProposalInvalidIdError } from './errors';

/** `triggeredBy` of every gate run this plugin starts on a caller's behalf. */
export const PROPOSALS_TRIGGER_SOURCE = 'proposals';

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
   * on the gateless path only — a gated proposal's dismissal is recorded behind its gate, which
   * does not carry the flag.
   */
  skipDiscardReason?: boolean;
  /**
   * Who decides the proposal. `none` writes it directly and decides it through the service, with
   * no execution parked behind it; `workflow` starts `system-create-proposal`. Omitted, a to-do is
   * gateless and everything else is gated.
   */
  gate?: ProposalGate;
  /**
   * Action workflow to run once a person approves the proposal: approving runs the workflow as the
   * approver, with `actionInput` as its single input. Checked before anything is created, so a
   * workflow the space cannot run or an input it does not accept is refused here rather than once
   * someone approves.
   */
  actionWorkflowId?: string;
  /** The action workflow's single `actionInput` object. Only meaningful with `actionWorkflowId`. */
  actionInput?: Record<string, unknown>;
  /**
   * The id to create the proposal under, for a caller that derives it from what it proposes. An
   * id that already exists is refused with `ProposalAlreadyExistsError` on the gateless path, and
   * fails the gate's create step on the gated one, which also requires a UUID. Unique across
   * spaces, not within one, so derive it from the space too.
   */
  id?: string;
}

export interface CreatedProposal {
  /**
   * The gate that will decide the proposal. Absent for a gateless proposal,
   * which the service writes and decides directly.
   */
  workflowExecutionId?: string;
  /**
   * Absent when the gate workflow had not stored it by the end of the wait.
   * Always present for a gateless proposal, which is created synchronously.
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
 * Two paths, picked by the caller's `gate`. Omitted, it is inferred from the category: a to-do is
 * carried out by the analyst and runs nothing, so it is written directly and decided by the
 * service, since a gate behind it would only park an execution nobody resumes until the analyst
 * gets to it. Everything else keeps the gate. A caller that proposes many actions at once, with no
 * deadline, asks for `none` explicitly: approving one starts its action as the approver without
 * an execution having been parked on it.
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
    const {
      title,
      comment,
      origin,
      impact,
      confidence,
      category,
      skipDiscardReason,
      actionWorkflowId,
      actionInput,
      id,
    } = proposal;
    const gate = proposal.gate ?? (category === PROPOSAL_CATEGORY_TODO ? 'none' : 'workflow');

    if (actionWorkflowId !== undefined && category === PROPOSAL_CATEGORY_TODO) {
      throw new ProposalInvalidActionInputError(
        `A "${PROPOSAL_CATEGORY_TODO}" proposal is carried out by the analyst, so it cannot ` +
          `run action workflow [${actionWorkflowId}]`
      );
    }

    if (gate === 'none') {
      // A proposal without an action never consults Workflows, so it needs only
      // `manage_proposals` — the privilege the gated branch checks as well. One
      // with an action does: its action is resolved now and started on approval.
      if (actionWorkflowId === undefined) {
        await privileges.assertCanManage(request);
      } else {
        await assertAvailable(request);
      }
      const created = await getProposalsService().create(
        {
          gate: 'none',
          conversationId,
          title,
          comment,
          origin,
          ...(category !== undefined && { category }),
          ...(actionWorkflowId !== undefined && { actionWorkflowId }),
          ...(actionInput !== undefined && { actionInput }),
          ...(id !== undefined && { id }),
          ...(skipDiscardReason !== undefined && { skipDiscardReason }),
          ...(asImpact(impact) !== undefined && { impact: asImpact(impact) }),
          confidence: asConfidence(confidence) ?? 'medium',
        },
        { spaceId, request }
      );
      return { proposal: created };
    }

    // The gate's create step only takes a UUID, and a run it fails would only show here as a
    // proposal that never appears.
    if (id !== undefined && !z.uuid().safeParse(id).success) {
      throw new ProposalInvalidIdError(`A gated proposal's id must be a UUID, got [${id}]`);
    }
    await assertAvailable(request);
    if (actionWorkflowId !== undefined) {
      await getProposalsService().assertActionProposable(
        actionWorkflowId,
        actionInput,
        spaceId,
        request
      );
    }
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
        ...(actionWorkflowId !== undefined && { actionWorkflowId }),
        ...(actionInput !== undefined && { actionInput }),
        ...(id !== undefined && { proposalId: id }),
      },
      // Not `manual`: the engine evaluates a `${{ }}` input of a manual run as an expression, and
      // these inputs are model-written. Our own source keeps them literal, so what was validated
      // above is what the approver sees and what runs.
      triggeredBy: PROPOSALS_TRIGGER_SOURCE,
      // The gate parks on the analyst's decision; only its start is awaited.
      waitForCompletion: false,
    });
    return { workflowExecutionId, proposal: await waitForProposal(workflowExecutionId, spaceId) };
  };

  return { create, assertAvailable };
};
