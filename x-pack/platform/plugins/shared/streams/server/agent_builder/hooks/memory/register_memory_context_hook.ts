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
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { MemoryHookServices } from './types';

const MAX_INJECTED_ENTRIES = 5;
const MAX_CONTENT_LENGTH = 2000;

export interface RegisterMemoryContextHookDeps {
  logger: Logger;
  getMemoryServices: () => MemoryHookServices;
}

/**
 * Registers a blocking beforeAgent hook that searches memory for entries
 * relevant to the user's input and injects them into the agent's context.
 */
export const registerMemoryContextHook = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: RegisterMemoryContextHookDeps
): void => {
  const logger = deps.logger.get('memoryContext');

  agentBuilder.hooks.register({
    id: 'memory-context-injection',
    priority: 10,
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
            const { memory, spaces } = deps.getMemoryServices();
            const spaceId = spaces?.spacesService?.getSpaceId(context.request) ?? DEFAULT_SPACE_ID;

            const results = await memory.search({
              query: userMessage,
              space: spaceId,
              size: MAX_INJECTED_ENTRIES,
            });

            if (results.length === 0) {
              return;
            }

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
