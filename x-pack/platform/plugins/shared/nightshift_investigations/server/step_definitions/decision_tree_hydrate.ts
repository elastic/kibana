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
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import { hydrateDecisionTreeWorkspace } from '../decision_trees/register_decision_trees';
import { withTimeout } from './with_timeout';

/** Caps beforeAgent so a stuck sandbox allocate cannot stall the reinforcement round. */
const HYDRATE_TIMEOUT_MS = 20_000;

export const decisionTreeHydrateStepDefinition = ({
  getSandboxStart,
  logger,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
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
      prompt: z
        .string()
        .max(500_000)
        .optional()
        .describe(
          'The round message. Reinforcement messages carry an accessed-trees marker; without it every tree is written (investigator hydrate).'
        ),
    }),
    outputSchema: z.object({
      conversation_id: z.string().describe('Conversation id that was hydrated.'),
      tree_count: z.number().describe('Number of decision trees written into the sandbox.'),
    }),
    handler: async (context) => {
      const { conversation_id: conversationId, prompt } = context.input;
      const sandboxStart = getSandboxStart();

      if (!sandboxStart) {
        throw new Error(
          'The sandbox is not configured — ' +
            'ensure the sandbox plugin is installed and configured.'
        );
      }

      // The hook runs this workflow in the caller's space, which is the same space the sandbox
      // tools resolve from the request, so both address the same workspace.
      const { spaceId } = context.contextManager.getContext().workflow;
      const session = sandboxStart.getSessionForSpace(spaceId, conversationId);

      const treeCount = await withTimeout(
        (signal) =>
          hydrateDecisionTreeWorkspace({
            session,
            esClient: context.contextManager.getScopedEsClient(),
            logger,
            spaceId,
            prompt,
            signal,
          }),
        HYDRATE_TIMEOUT_MS,
        `Decision tree hydrate timed out after ${HYDRATE_TIMEOUT_MS}ms`
      );

      return { output: { conversation_id: conversationId, tree_count: treeCount } };
    },
  });
