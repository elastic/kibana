/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { createProposalStepCommonDefinition } from '../../../common/proposals/step_types/create_proposal_step';
import { resolveExpiresAt } from './resolve_expires_at';
import { assertManageProposals } from './assert_manage_proposals';
import type { ProposalsService } from '../services/proposals_service';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';

/**
 * Calls the proposals service in-process. The workflow execution id comes from
 * the step context rather than the caller, so approving the proposal always
 * resumes the execution that actually created it.
 */
export const getCreateProposalStepDefinition = ({
  getProposalsService,
  resolveUser,
  getSecurity,
}: {
  getProposalsService: () => ProposalsService;
  resolveUser: ResolveProposalUser;
  getSecurity: () => SecurityPluginStart;
}) =>
  createServerStepDefinition({
    ...createProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const workflowContext = context.contextManager.getContext();
        const spaceId = workflowContext.workflow.spaceId;
        const workflowExecutionId = workflowContext.execution.id;

        await assertManageProposals({
          request: context.contextManager.getFakeRequest(),
          security: getSecurity(),
          spaceId,
        });

        // The step runs under the execution's own credentials, so the fake
        // request is what identifies the Worker that is proposing.
        const user = await resolveUser(context.contextManager.getFakeRequest());

        const proposal = await getProposalsService().create(
          {
            conversationId: context.input.conversationId,
            comment: context.input.comment,
            actionWorkflowId: context.input.actionWorkflowId,
            actionInput: context.input.actionInput,
            impact: context.input.impact ?? 'low',
            confidence: context.input.confidence ?? 'medium',
            origin: context.input.origin ?? 'worker',
            expiresAt: resolveExpiresAt(context.input.expiresIn),
            workflowExecutionId,
          },
          {
            spaceId,
            // `execution.executedBy` is only ever a username, so it is the last
            // resort when the request yields no identity at all.
            user: user ?? {
              username: workflowContext.execution.executedBy ?? null,
              fullName: null,
              email: null,
            },
          }
        );

        context.logger.debug(
          `Created proposal ${proposal.id} for execution ${workflowExecutionId}`
        );

        return {
          output: {
            proposalId: proposal.id,
            status: proposal.status,
            category: proposal.category,
            requiresDecision: proposal.status === 'pending',
          },
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error : new Error('Failed to create proposal'),
        };
      }
    },
  });
