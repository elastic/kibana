/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { updateProposalStepCommonDefinition } from '../../../common/proposals/step_types/update_proposal_step';
import type { ProposalsService } from '../services/proposals_service';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { parseStepInput } from './parse_step_input';
import { toStepError } from './to_step_error';

export const getUpdateProposalStepDefinition = ({
  getProposalsService,
  resolveUser,
  privileges,
}: {
  getProposalsService: () => ProposalsService;
  resolveUser: ResolveProposalUser;
  privileges: ProposalPrivilegesChecker;
}) =>
  createServerStepDefinition({
    ...updateProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(updateProposalStepCommonDefinition.inputSchema, context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const request = context.contextManager.getFakeRequest();

        await privileges.assertCanManage(request);

        // An authenticated resume clones the resumer's API key onto the task,
        // so the request is the better attribution when it yields anything.
        // It does not on every surface — an external resume runs under the
        // workflow runner — which is why the gate's own `respondedBy` is the
        // fallback rather than the other way round.
        const decidedBy =
          input.decision !== undefined
            ? ((await resolveUser(request)) ??
              (input.decidedBy
                ? { username: input.decidedBy, fullName: null, email: null }
                : undefined))
            : undefined;

        const proposal = await getProposalsService().update(
          {
            id: input.proposalId,
            status: input.status,
            decision: input.decision,
            decidedBy,
            dismissReason: input.dismissReason,
            rationale: input.rationale,
            executionError: input.executionError,
          },
          spaceId
        );

        return {
          output: {
            proposalId: proposal.id,
            status: proposal.status,
            decision: proposal.decision,
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to update proposal');
      }
    },
  });
