/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  RunContextStackEntry,
  ToolHandlerContext,
} from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  createProposalRequestSchema,
  MAX_TITLE_LENGTH,
  PROPOSALS_CREATE_TOOL_ID,
  proposalCategorySchema,
  proposalConfidenceSchema,
  proposalImpactSchema,
  proposalOriginSchema,
} from '@kbn/proposals-common';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import type { ProposalsService } from '../services/proposals_service';

export const createProposalToolSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(MAX_TITLE_LENGTH)
    .describe('Short plain-text label naming the proposed action, no Markdown.'),
  comment: createProposalRequestSchema.shape.comment
    .min(1)
    .describe(
      'What to do and why, as Markdown for the analyst who carries it out: the concrete steps, commands or config changes, and the findings that support them.'
    ),
  origin: proposalOriginSchema.describe(
    'The feature you are working for, as named in your instructions. It routes the proposal to that feature\'s queue; use "agent_builder" when none applies.'
  ),
  impact: proposalImpactSchema
    .optional()
    .describe('How disruptive carrying out the action is. Defaults to "low".'),
  confidence: proposalConfidenceSchema
    .optional()
    .describe(
      'How strongly the findings support that this action resolves the issue. Defaults to "medium".'
    ),
  category: proposalCategorySchema
    .optional()
    .describe('Grouping for the decision queue, when your instructions name one.'),
});

export type CreateProposalToolParams = z.infer<typeof createProposalToolSchema>;

const DESCRIPTION =
  'Propose an action for a human to decide, in the current conversation. ' +
  'The proposal runs nothing: the analyst carries it out and approves or dismisses it. ' +
  'Create one proposal per distinct action, and only for concrete steps (a command, a config change, a code fix, a rollback), not general advice. ' +
  'The proposal card is added to the conversation for the analyst; returns the proposal id once it exists.';

/** How long the tool waits for the gate workflow to create the proposal before it answers. */
export const DEFAULT_PROPOSAL_WAIT = { timeoutMs: 5000, intervalMs: 500 } as const;

export const PROPOSAL_PENDING_NOTE =
  'The proposal is being created; its card will appear in the conversation. Do not create it again.';

/**
 * Conversation the tool runs in: that of the innermost agent on the run stack. Undefined when
 * that agent runs standalone.
 */
const getToolConversationId = ({ runContext }: Pick<ToolHandlerContext, 'runContext'>) =>
  runContext.stack.findLast(
    (entry): entry is Extract<RunContextStackEntry, { type: 'agent' }> => entry.type === 'agent'
  )?.conversationId;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `proposals.create`: an agent proposes an action without an action workflow, in the
 * conversation it runs in. Like any Worker, it starts the managed gate workflow
 * (`system-create-proposal`) as the caller rather than writing the proposal itself, because a
 * proposal's decision is only ever recorded behind its gate. The gate's create step indexes the
 * proposal and attaches its `platform.proposal` card through the public attachment client, which
 * needs the caller to own the conversation. The tool waits briefly for the proposal to exist.
 * Each call leaves one gate execution parked until the analyst decides or the proposal expires.
 */
export const createProposalTool = ({
  getProposalsService,
  getWorkflowsApi,
  privileges,
  logger,
  wait = DEFAULT_PROPOSAL_WAIT,
}: {
  getProposalsService: () => ProposalsService;
  getWorkflowsApi: () => WorkflowsServerPluginSetup['management'];
  privileges: ProposalPrivilegesChecker;
  logger: Logger;
  wait?: { timeoutMs: number; intervalMs: number };
}): BuiltinToolDefinition<typeof createProposalToolSchema> => {
  const assertAvailable = async (request: KibanaRequest): Promise<void> => {
    if (!getWorkflowsApi().isWorkflowsAvailable) {
      throw new Error('Workflows are not available, so proposals cannot be created');
    }
    // In-process, so the route's `security.authz` does not apply.
    await privileges.assertCanManage(request);
  };

  const waitForProposal = async (workflowExecutionId: string, spaceId: string) => {
    const deadline = Date.now() + wait.timeoutMs;
    do {
      const proposal = await getProposalsService().findByWorkflowExecutionId(
        workflowExecutionId,
        spaceId
      );
      if (proposal) {
        return proposal;
      }
      await sleep(wait.intervalMs);
    } while (Date.now() < deadline);
    return undefined;
  };

  return {
    id: PROPOSALS_CREATE_TOOL_ID,
    type: ToolType.builtin,
    description: DESCRIPTION,
    schema: createProposalToolSchema,
    annotations: {
      title: 'Create Proposal',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    tags: ['proposals'],
    excludeFromMcp: true,
    availability: {
      // Per principal, so it cannot be cached per space.
      cacheMode: 'none',
      handler: async ({ request, spaceId }) => {
        try {
          await assertAvailable(request);
          // Starting the gate also needs execute access to the managed workflow; without it
          // every call would fail. The handler does not repeat this: `executeWorkflow` checks it.
          await getWorkflowsApi().assertWorkflowAccess(
            CREATE_PROPOSAL_WORKFLOW_ID,
            spaceId,
            'execute',
            request
          );
          return { status: 'available' };
        } catch (error) {
          return { status: 'unavailable', reason: errorMessage(error) };
        }
      },
    },
    handler: async (
      { title, comment, origin, impact, confidence, category },
      { request, spaceId, runContext }
    ) => {
      const conversationId = getToolConversationId({ runContext });
      if (!conversationId) {
        return {
          results: [
            createErrorResult(
              `${PROPOSALS_CREATE_TOOL_ID} can only be used inside a conversation.`
            ),
          ],
        };
      }

      try {
        await assertAvailable(request);
        const { workflowExecutionId } = await getWorkflowsApi().executeWorkflow({
          workflowId: CREATE_PROPOSAL_WORKFLOW_ID,
          spaceId,
          request,
          inputs: {
            conversationId,
            title,
            comment,
            origin,
            ...(impact !== undefined && { impact }),
            ...(confidence !== undefined && { confidence }),
            ...(category !== undefined && { category }),
          },
          // The gate parks on the analyst's decision; only its start is awaited.
          waitForCompletion: false,
        });

        const proposal = await waitForProposal(workflowExecutionId, spaceId);
        if (!proposal) {
          return {
            results: [
              createOtherResult({
                acknowledged: true,
                workflow_execution_id: workflowExecutionId,
                note: PROPOSAL_PENDING_NOTE,
              }),
            ],
          };
        }
        return {
          results: [
            createOtherResult({
              acknowledged: true,
              proposal_id: proposal.id,
              title: proposal.title,
              status: proposal.status,
              workflow_execution_id: workflowExecutionId,
            }),
          ],
        };
      } catch (error) {
        logger.warn(
          `Tool ${PROPOSALS_CREATE_TOOL_ID} failed for conversation ${conversationId}: ${errorMessage(
            error
          )}`
        );
        return { results: [createErrorResult(errorMessage(error))] };
      }
    },
  };
};
