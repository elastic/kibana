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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SandboxApiClient } from '../tools/sandbox_bash/grpc_client';
import { hydrateMemoryWorkspace } from '../memory/register_memory';

export const memoryHydrateStepDefinition = ({
  getConnectionManager,
  logger,
}: {
  getConnectionManager: () => { apiClient: SandboxApiClient } | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryHydrate',
    label: 'Hydrate Nightshift Semantic Memory',
    category: StepCategory.System,
    description:
      'Pre-execution workflow that materializes the Semantic Memory wiki into the ' +
      'investigator sandbox before each agent round.',
    inputSchema: z.object({
      conversation_id: z.string().max(1024).describe('The sandbox conversation workspace id.'),
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The materializer finished without throwing.'),
    }),
    handler: async (context) => {
      const connectionManager = getConnectionManager();
      if (!connectionManager) {
        logger.debug('Memory hydration skipped — sandbox unavailable');
        return { output: { status: 'ok' as const } };
      }

      const esClient = context.contextManager.getScopedEsClient();
      const spaceId = context.contextManager.getContext().workflow.spaceId ?? DEFAULT_SPACE_ID;

      await hydrateMemoryWorkspace({
        apiClient: connectionManager.apiClient,
        conversationId: context.input.conversation_id,
        esClient,
        spaceId,
        signal: context.abortSignal,
        logger,
      });

      return { output: { status: 'ok' as const } };
    },
  });
