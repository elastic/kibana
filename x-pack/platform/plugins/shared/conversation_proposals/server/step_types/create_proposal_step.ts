/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createProposalStepCommonDefinition } from '../../common/step_types/create_proposal_step';
import type { ProposalsService } from '../services/proposals_service';

/**
 * Calls the proposals service in-process. The workflow execution id comes from
 * the step context rather than the caller, so approving the proposal always
 * resumes the execution that actually created it.
 */
export const getCreateProposalStepDefinition = ({
  getProposalsService,
}: {
  getProposalsService: () => ProposalsService;
}) =>
  createServerStepDefinition({
    ...createProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const workflowContext = context.contextManager.getContext();
        const spaceId = workflowContext.workflow.spaceId;
        const workflowExecutionId = workflowContext.execution.id;

        const proposal = await getProposalsService().create(
          {
            conversationId: context.input.conversationId,
            // Blank strings arriving from unrendered templates are normalized
            // to absent by the service.
            comment: context.input.comment,
            actionWorkflowId: context.input.actionWorkflowId,
            actionInput: context.input.actionInput,
            impact: context.input.impact ?? 'low',
            confidence: context.input.confidence ?? 'medium',
            targetEntities: context.input.targetEntities,
            origin: context.input.origin ?? 'worker',
            expiresAt: context.input.expiresAt,
            supersedesProposalId: context.input.supersedesProposalId,
            workflowExecutionId,
          },
          { spaceId, username: workflowContext.execution.executedBy }
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
