/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ProposalUser } from '@kbn/proposals-common';
import { updateProposalStepCommonDefinition } from '@kbn/proposals-common';
import type { ProposalsService } from '../services/proposals_service';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import type { ResolveWorkerUser } from '../services/resolve_worker_user';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { parseStepInput } from './parse_step_input';
import { resolveStepUser } from './resolve_step_user';
import { toStepError } from './to_step_error';

/** The gate's responder, with the profile the request resolves when it names that same user. */
const resolveResponder = async ({
  request,
  respondedBy,
  resolveUser,
  logger,
}: {
  request: KibanaRequest;
  respondedBy: string;
  resolveUser: ResolveProposalUser;
  logger: StepHandlerContext['logger'];
}): Promise<ProposalUser> => {
  const user = await resolveUser(request);
  if (user?.username === respondedBy) {
    return user;
  }
  if (user) {
    logger.warn(
      `The executing user "${user.username}" is not the gate responder "${respondedBy}", so only the responder's username is recorded`
    );
  }
  return { username: respondedBy, fullName: null, email: null };
};

export const getUpdateProposalStepDefinition = ({
  getProposalsService,
  resolveUser,
  resolveWorkerUser,
  privileges,
}: {
  getProposalsService: () => ProposalsService;
  resolveUser: ResolveProposalUser;
  resolveWorkerUser: ResolveWorkerUser;
  privileges: ProposalPrivilegesChecker;
}) =>
  createServerStepDefinition({
    ...updateProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(updateProposalStepCommonDefinition.inputSchema, context.input);
        const workflowContext = context.contextManager.getContext();
        const spaceId = workflowContext.workflow.spaceId;
        const request = context.contextManager.getFakeRequest();

        await privileges.assertCanManage(request);

        // The gate applies each answer in a child that runs as whoever
        // answered, so the request carries the decider's profile. It is only
        // trusted when it names the user the gate stamped as `respondedBy`: a
        // resume that lands while the task is still running keeps the key the
        // previous approver claimed it with. A blank `decidedBy` means nobody
        // answered the gate, so the Worker running it auto-approved; only then
        // is the Worker the decider.
        const decidedBy =
          input.decision === undefined
            ? undefined
            : input.decidedBy
            ? await resolveResponder({
                request,
                respondedBy: input.decidedBy,
                resolveUser,
                logger: context.logger,
              })
            : await resolveStepUser({
                request,
                executionId: workflowContext.execution.id,
                spaceId,
                resolveUser,
                resolveWorkerUser,
              });

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
