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
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { runMemoryOptimize } from '../memory/register_memory';
import { withTimeout } from './with_timeout';

const MAX_ROUND_TEXT_LENGTH = 65_536;
const OPTIMIZE_TIMEOUT_MS = 120_000;

export const memoryOptimizeStepDefinition = ({
  getInference,
  getSearchInferenceEndpoints,
  logger,
}: {
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryOptimize',
    label: 'Optimize Semantic Memories',
    category: StepCategory.Ai,
    description:
      'Proposes and applies ratings and extractions for Semantic Memories based on ' +
      'the completed investigation round.',
    inputSchema: z.object({
      prompt: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe('The user message that started the round.'),
      response: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe("The assistant's final response for the round."),
      agent_id: z.string().max(1024).optional().describe('Agent id that produced the round.'),
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The memory optimizer finished without throwing.'),
    }),
    handler: async (context) => {
      await withTimeout(
        async () => {
          const esClient = context.contextManager.getScopedEsClient();
          const spaceId = context.contextManager.getContext().workflow.spaceId ?? DEFAULT_SPACE_ID;

          await runMemoryOptimize({
            request: context.contextManager.getFakeRequest(),
            agentId: context.input.agent_id,
            userMessage: context.input.prompt,
            assistantMessage: context.input.response,
            esClient,
            spaceId,
            signal: context.abortSignal,
            getInference,
            getSearchInferenceEndpoints,
            logger,
          });
        },
        OPTIMIZE_TIMEOUT_MS,
        `Memory optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`
      );

      return { output: { status: 'ok' as const } };
    },
  });
