/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HookLifecycle,
  HookExecutionMode,
  type BeforeAgentHookContext,
  type HookHandlerResult,
} from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { InternalSetupServices, InternalStartServices } from '../../services';
import { getCurrentSpaceId } from '../../utils/spaces';

const MAX_INJECTED_ENTRIES = 5;
const MAX_CONTENT_LENGTH = 2000;

export interface RegisterMemoryContextHookDeps {
  logger: Logger;
  getInternalServices: () => InternalStartServices;
}

/**
 * Registers a blocking beforeAgent hook that searches memory for entries
 * relevant to the user's input and injects them into the agent's context.
 *
 * This makes agents memory-aware by default — they see relevant knowledge
 * without needing to explicitly call memory_search.
 */
export const registerMemoryContextHook = (
  serviceSetups: InternalSetupServices,
  deps: RegisterMemoryContextHookDeps
): void => {
  const logger = deps.logger.get('memoryContext');

  serviceSetups.hooks.register({
    id: 'memory-context-injection',
    priority: 10, // Run early so other hooks see enriched input
    hooks: {
      [HookLifecycle.beforeAgent]: {
        mode: HookExecutionMode.blocking,
        handler: async (
          context: BeforeAgentHookContext
        ): Promise<void | HookHandlerResult<typeof HookLifecycle.beforeAgent>> => {
          const userMessage = context.nextInput.message;
          if (!userMessage || userMessage.trim().length < 3) {
            return;
          }

          try {
            const { memory, spaces } = deps.getInternalServices();
            const spaceId = getCurrentSpaceId({
              request: context.request,
              spaces,
            });

            const results = await memory.search({
              query: userMessage,
              space: spaceId,
              size: MAX_INJECTED_ENTRIES,
            });

            if (results.length === 0) {
              return;
            }

            // Build context block with relevant memory entries
            const memoryBlock = results
              .map((r) => {
                const snippet =
                  r.snippet.length > MAX_CONTENT_LENGTH
                    ? r.snippet.substring(0, MAX_CONTENT_LENGTH) + '...'
                    : r.snippet;
                return `### ${r.title} (${r.path})\n${snippet}`;
              })
              .join('\n\n');

            const memoryPrefix = [
              '<memory_context>',
              'The following entries from shared memory may be relevant to this conversation.',
              'You have access to memory tools (memory_search, memory_read, memory_write, memory_patch, memory_list, memory_delete).',
              'If the user reports that information in memory is wrong, use memory_patch to fix it.',
              'If you learn something new and noteworthy, offer to save it to memory.',
              '',
              memoryBlock,
              '</memory_context>',
            ].join('\n');

            return {
              nextInput: {
                ...context.nextInput,
                message: `${memoryPrefix}\n\n${userMessage}`,
              },
            };
          } catch (error) {
            logger.debug(
              `Memory context injection failed (non-fatal): ${(error as Error).message}`
            );
            return;
          }
        },
      },
    },
  });
};
