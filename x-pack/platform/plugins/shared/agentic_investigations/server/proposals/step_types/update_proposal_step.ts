/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { updateProposalStepCommonDefinition } from '../../../common/proposals/step_types/update_proposal_step';
import type { ProposalsService } from '../services/proposals_service';

export const getUpdateProposalStepDefinition = ({
  getProposalsService,
}: {
  getProposalsService: () => ProposalsService;
}) =>
  createServerStepDefinition({
    ...updateProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const spaceId = context.contextManager.getContext().workflow.spaceId;

        const proposal = await getProposalsService().update(
          {
            id: context.input.proposalId,
            status: context.input.status,
            executionError: context.input.executionError,
          },
          spaceId
        );

        return { output: { proposalId: proposal.id, status: proposal.status } };
      } catch (error) {
        return {
          error: error instanceof Error ? error : new Error('Failed to update proposal'),
        };
      }
    },
  });
