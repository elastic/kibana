/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getProposalStepCommonDefinition } from '../../../common/proposals/step_types/get_proposal_step';
import type { ProposalsService } from '../services/proposals_service';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { parseStepInput } from './parse_step_input';
import { toStepError } from './to_step_error';

export const getGetProposalStepDefinition = ({
  getProposalsService,
  privileges,
}: {
  getProposalsService: () => ProposalsService;
  privileges: ProposalPrivilegesChecker;
}) =>
  createServerStepDefinition({
    ...getProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(getProposalStepCommonDefinition.inputSchema, context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;

        const request = context.contextManager.getFakeRequest();
        await privileges.assertCanRead(request);

        const proposal = await getProposalsService().get(input.proposalId, spaceId, request);

        return {
          output: {
            status: proposal.status,
            decision: proposal.decision,
            decidedBy: proposal.decidedBy,
            supersededBy: proposal.supersededBy,
            expiresAt: proposal.expiresAt,
            actionWorkflowId: proposal.actionWorkflowId,
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to read proposal');
      }
    },
  });
