/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createProposalStepCommonDefinition } from '../../../common/proposals/step_types/create_proposal_step';
import { resolveExpiresAt } from './resolve_expires_at';
import type { ProposalsService } from '../services/proposals_service';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { parseStepInput } from './parse_step_input';
import { toStepError } from './to_step_error';

/**
 * Calls the proposals service in-process. The workflow execution id comes from
 * the step context rather than the caller, so approving the proposal always
 * resumes the execution that actually created it.
 */
export const getCreateProposalStepDefinition = ({
  getProposalsService,
  resolveUser,
  privileges,
}: {
  getProposalsService: () => ProposalsService;
  resolveUser: ResolveProposalUser;
  privileges: ProposalPrivilegesChecker;
}) =>
  createServerStepDefinition({
    ...createProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(createProposalStepCommonDefinition.inputSchema, context.input);
        const workflowContext = context.contextManager.getContext();
        const spaceId = workflowContext.workflow.spaceId;
        const workflowExecutionId = workflowContext.execution.id;
        // The step runs under the execution's own credentials, so the fake
        // request is what identifies the Worker that is proposing.
        const request = context.contextManager.getFakeRequest();

        // Throws rather than degrading: a Worker without the privilege to write
        // proposals is a misconfiguration, and there is no recovery path worth
        // retrying.
        await privileges.assertCanManage(request);

        const user = await resolveUser(request);

        const proposal = await getProposalsService().create(
          {
            conversationId: input.conversationId,
            comment: input.comment,
            actionWorkflowId: input.actionWorkflowId,
            actionInput: input.actionInput,
            impact: input.impact,
            category: input.category,
            confidence: input.confidence ?? 'medium',
            origin: input.origin ?? 'worker',
            expiresAt: resolveExpiresAt(input.expiresIn),
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
            rootProposalId: proposal.rootProposalId ?? proposal.id,
            status: proposal.status,
            category: proposal.category,
            requiresDecision: proposal.decision == null,
            expiresAt: proposal.expiresAt,
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to create proposal');
      }
    },
  });
