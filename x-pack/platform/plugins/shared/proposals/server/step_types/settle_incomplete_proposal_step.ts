/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  settleIncompleteProposalStatusSchema,
  settleIncompleteProposalStepCommonDefinition,
} from '@kbn/proposals-common';
import { ProposalNotFoundError } from '../services/errors/proposal_not_found_error';
import type { ProposalsService } from '../services/proposals_service';
import { parseStepInput } from './parse_step_input';
import { toStepError } from './to_step_error';

/**
 * Last-chance / incomplete settles that must succeed even when the execution
 * is running under a resumer who lacks `manage_proposals`. Privilege checks
 * live on the decide path (`checkDecidePrivileges` + `updateProposal`); this
 * step deliberately skips them so gate expiry, attempt-budget exhaustion, and
 * the workflow-level fallback can still leave the record terminal.
 */
export const getSettleIncompleteProposalStepDefinition = ({
  getProposalsService,
}: {
  getProposalsService: () => ProposalsService;
}) =>
  createServerStepDefinition({
    ...settleIncompleteProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(
          settleIncompleteProposalStepCommonDefinition.inputSchema,
          context.input
        );
        const workflowContext = context.contextManager.getContext();
        const spaceId = workflowContext.workflow.spaceId;
        const request = context.contextManager.getFakeRequest();
        const service = getProposalsService();

        // Same adopt the loop does before every write: a revision appended
        // while the gate was parked would leave the carried id superseded.
        const found = await service
          .getLatestRevision(input.proposalId, spaceId)
          .then(async (latest) => ({
            latest,
            proposal: await service.get(latest.proposalId, spaceId, request),
          }))
          .catch((error) => {
            if (error instanceof ProposalNotFoundError) {
              return undefined;
            }
            throw error;
          });

        // The proposal was deleted with its conversation while the gate was parked: nothing is
        // left to settle, and failing here would end an expired gate as a failed run.
        if (found === undefined) {
          return {
            output: { proposalId: input.proposalId, status: input.status ?? 'expired' },
          };
        }
        const { latest, proposal } = found;

        const status = input.status ?? (proposal.decision !== undefined ? 'failed' : 'expired');

        const updated = await service.update(
          {
            id: latest.proposalId,
            status,
            executionError: input.executionError,
          },
          spaceId,
          {
            workflowId: workflowContext.workflow.id,
            executionId: workflowContext.execution.id,
            request,
          }
        );

        return {
          output: {
            proposalId: updated.id,
            status: settleIncompleteProposalStatusSchema.parse(updated.status),
            decision: updated.decision,
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to settle incomplete proposal');
      }
    },
  });
