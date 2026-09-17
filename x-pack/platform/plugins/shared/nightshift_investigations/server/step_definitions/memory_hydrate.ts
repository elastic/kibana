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
import { hydrateMemoryWorkspace } from '../memory/register_memory';
import { scopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withTimeout } from './with_timeout';

/** Caps beforeAgent so a stuck sandbox allocate cannot stall the investigation. */
const HYDRATE_TIMEOUT_MS = 20_000;

export const memoryHydrateStepDefinition = ({
  getConnectionManager,
  logger,
}: {
  getConnectionManager: () => SandboxConnectionManager | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryHydrate',
    label: 'Hydrate Nightshift Semantic Memory into Sandbox',
    category: StepCategory.Ai,
    description:
      'Writes ranked Semantic Memory pages into /workspace/memories for the given conversation. ' +
      'Uses the raw sandbox client so workspace restore still runs on the first tool call.',
    inputSchema: z.object({
      conversation_id: z
        .string()
        .min(1)
        .max(1024)
        .describe('Conversation id that namespaces the sandbox.'),
      prompt: z
        .string()
        .max(65_536)
        .optional()
        .describe('The user message for this round, used as a memory search query when present.'),
    }),
    outputSchema: z.object({
      conversation_id: z.string().describe('Conversation id that was hydrated.'),
    }),
    handler: async (context) => {
      const { conversation_id: conversationId, prompt } = context.input;
      const manager = getConnectionManager();

      if (!manager) {
        throw new Error(
          'The Nightshift sandbox is not configured — ' +
            'set xpack.nightshift_investigations.sandbox in kibana.yml.'
        );
      }

      const { spaceId } = context.contextManager.getContext().workflow;
      const scopedConversationId = scopeConversationId(spaceId, conversationId);

      await withTimeout(
        (signal) =>
          hydrateMemoryWorkspace({
            apiClient: manager.apiClient,
            conversationId: scopedConversationId,
            esClient: context.contextManager.getScopedEsClient(),
            spaceId,
            query: prompt,
            signal,
            logger,
          }),
        HYDRATE_TIMEOUT_MS,
        `Memory hydrate timed out after ${HYDRATE_TIMEOUT_MS}ms`
      );

      return { output: { conversation_id: scopedConversationId } };
    },
  });
