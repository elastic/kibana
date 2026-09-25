/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getLatestRevisionStepCommonDefinition } from '@kbn/proposals-common';
import type { ProposalsService } from '../services/proposals_service';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { parseStepInput } from './parse_step_input';
import { toStepError } from './to_step_error';

export const getGetLatestRevisionStepDefinition = ({
  getProposalsService,
  privileges,
}: {
  getProposalsService: () => ProposalsService;
  privileges: ProposalPrivilegesChecker;
}) =>
  createServerStepDefinition({
    ...getLatestRevisionStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(
          getLatestRevisionStepCommonDefinition.inputSchema,
          context.input
        );
        const spaceId = context.contextManager.getContext().workflow.spaceId;

        await privileges.assertCanRead(context.contextManager.getFakeRequest());

        const latest = await getProposalsService().getLatestRevision(input.proposalId, spaceId);

        return { output: latest };
      } catch (error) {
        throw toStepError(error, 'Failed to resolve latest revision');
      }
    },
  });
