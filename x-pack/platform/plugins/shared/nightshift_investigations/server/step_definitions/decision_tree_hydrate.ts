/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import type { SandboxConnectionManager } from '../tools/sandbox_bash/grpc_client';
import { hydrateDecisionTreeWorkspace } from '../decision_trees/register_decision_trees';
import { scopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withTimeout } from './with_timeout';

/** Caps beforeAgent so a stuck sandbox allocate cannot stall the reinforcement round. */
const HYDRATE_TIMEOUT_MS = 20_000;

export const decisionTreeHydrateStepDefinition = ({
  getConnectionManager,
  logger,
}: {
  getConnectionManager: () => SandboxConnectionManager | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.decisionTreeHydrate',
    label: 'Hydrate Decision Trees into Sandbox',
    category: StepCategory.Ai,
    description:
      'Writes the stored decision trees into /workspace/decision-trees for the given conversation ' +
      'so the reinforcement agent can read and edit them with its sandbox file tools.',
    inputSchema: z.object({
      conversation_id: z
        .string()
        .min(1)
        .max(1024)
        .describe('Conversation id that namespaces the sandbox.'),
    }),
    outputSchema: z.object({
      conversation_id: z.string().describe('Conversation id that was hydrated.'),
      tree_count: z.number().describe('Number of decision trees written into the sandbox.'),
    }),
    handler: async (context) => {
      const { conversation_id: conversationId } = context.input;
      const manager = getConnectionManager();

      if (!manager) {
        throw new Error(
          'The Nightshift sandbox is not configured — ' +
            'set xpack.nightshift_investigations.sandbox in kibana.yml.'
        );
      }

      // The hook runs this workflow in the caller's space, which is the same space the sandbox
      // tools resolve from the request, so both address the same workspace.
      const { spaceId } = context.contextManager.getContext().workflow;
      const scopedConversationId = scopeConversationId(spaceId, conversationId);

      const treeCount = await withTimeout(
        hydrateDecisionTreeWorkspace({
          apiClient: manager.apiClient,
          conversationId: scopedConversationId,
          esClient: context.contextManager.getScopedEsClient(),
          logger,
        }),
        HYDRATE_TIMEOUT_MS,
        `Decision tree hydrate timed out after ${HYDRATE_TIMEOUT_MS}ms`
      );

      return { output: { conversation_id: scopedConversationId, tree_count: treeCount } };
    },
  });
