/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ProposalsService } from '../services/proposals_service';
import { assertManageProposals } from './assert_manage_proposals';
import { cloneProposalStepCommonDefinition } from '../../../common/proposals/step_types/clone_proposal_step';

export const getCloneProposalStepDefinition = ({
  getProposalsService,
  getSecurity,
}: {
  getProposalsService: () => ProposalsService;
  getSecurity: () => SecurityPluginStart;
}) =>
  createServerStepDefinition({
    ...cloneProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const workflowContext = context.contextManager.getContext();
        const spaceId = workflowContext.workflow.spaceId;
        const workflowExecutionId = workflowContext.execution.id;
        // Same gate as the HTTP routes: the execution's own credentials must
        // hold manage_proposals, checked in the execution's space.
        await assertManageProposals({
          request: context.contextManager.getFakeRequest(),
          security: getSecurity(),
          spaceId,
        });
        // The schema maps blank liquid renders to absent, so a present
        // overrides object is caller intent, not template noise.
        const proposal = await getProposalsService().clone(
          { proposalId: context.input.proposalId, overrides: context.input.overrides },
          spaceId,
          { workflowExecutionId }
        );
        context.logger.debug(
          `Cloned proposal ${context.input.proposalId} into ${proposal.id} for recovery execution ${workflowExecutionId}`
        );
        return {
          output: {
            proposalId: proposal.id,
            status: proposal.status,
            requiresDecision: proposal.status === 'pending',
          },
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error : new Error('Failed to clone proposal'),
        };
      }
    },
  });
