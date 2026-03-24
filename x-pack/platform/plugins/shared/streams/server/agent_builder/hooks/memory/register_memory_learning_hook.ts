/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import type { MemoryHookServices } from './types';

/** Number of tool calls between learning reflections. */
const DEFAULT_LEARNING_INTERVAL = 5;

export interface RegisterMemoryLearningHookDeps {
  logger: Logger;
  getMemoryServices: () => MemoryHookServices;
  learningInterval?: number;
}

// Track round counts per conversation to know when to trigger learning.
const roundCounters = new Map<string, number>();

/**
 * Registers a non-blocking afterToolCall hook that periodically triggers
 * a learning reflection.
 */
export const registerMemoryLearningHook = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: RegisterMemoryLearningHookDeps
): void => {
  const logger = deps.logger.get('memoryLearning');
  const interval = deps.learningInterval ?? DEFAULT_LEARNING_INTERVAL;

  agentBuilder.hooks.register({
    id: 'memory-periodic-learning',
    hooks: {
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: async (context: AfterToolCallHookContext): Promise<void> => {
          const conversationKey =
            context.toolHandlerContext.runContext.stack.find((e) => e.type === 'agent')
              ?.conversationId ?? context.toolHandlerContext.runContext.runId;

          if (!conversationKey) {
            return;
          }

          const count = (roundCounters.get(conversationKey) ?? 0) + 1;
          roundCounters.set(conversationKey, count);

          if (count % interval !== 0) {
            return;
          }

          try {
            const { memory } = deps.getMemoryServices();
            const { spaceId, modelProvider } = context.toolHandlerContext;

            const tree = await memory.getTree({ space: spaceId });

            const learningPrompt = [
              'Based on the recent conversation, identify any new facts, corrections, or insights',
              'that should be stored in the shared memory knowledge base.',
              '',
              'For each learning, provide:',
              '- path: a wiki path (e.g. "ops/runbooks/deploy-checklist")',
              '- title: a concise title',
              '- content: markdown content summarizing the learning',
              '- action: "create" for new entries, "update" for corrections to existing entries',
              '',
              tree.length > 0
                ? `Current memory has ${tree.length} top-level entries. Check if your learnings overlap with existing content.`
                : 'Memory is currently empty — focus on foundational knowledge.',
              '',
              'If there is nothing worth remembering, respond with: NO_LEARNINGS',
              '',
              'Respond as a JSON array of objects with {path, title, content, action} fields,',
              'or the string NO_LEARNINGS.',
            ].join('\n');

            const { chatModel } = await modelProvider.getDefaultModel();
            const response = await chatModel.invoke([{ role: 'user', content: learningPrompt }]);

            const responseText =
              typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);

            if (responseText.includes('NO_LEARNINGS') || responseText.trim().length < 10) {
              logger.debug(`No learnings identified at round ${count} for ${conversationKey}`);
              return;
            }

            const learnings = parseLearnings(responseText);
            const user = `agent:${context.agentId ?? 'system'}`;

            for (const learning of learnings) {
              const existing = await memory.getByPath({
                path: learning.path,
                space: spaceId,
              });

              if (existing && learning.action === 'update') {
                await memory.update({
                  id: existing.id,
                  content: learning.content,
                  title: learning.title,
                  space: spaceId,
                  user,
                  changeSummary: 'Updated via periodic learning reflection',
                });
              } else if (!existing && learning.action === 'create') {
                await memory.create({
                  path: learning.path,
                  title: learning.title,
                  content: learning.content,
                  tags: ['auto-learned'],
                  space: spaceId,
                  user,
                });
              }
            }

            logger.debug(
              `Processed ${learnings.length} learnings at round ${count} for ${conversationKey}`
            );
          } catch (error) {
            logger.debug(
              `Memory learning reflection failed (non-fatal): ${(error as Error).message}`
            );
          }
        },
      },
    },
  });
};

interface Learning {
  path: string;
  title: string;
  content: string;
  action: 'create' | 'update';
}

const parseLearnings = (text: string): Learning[] => {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is Learning =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.path === 'string' &&
        typeof item.title === 'string' &&
        typeof item.content === 'string' &&
        (item.action === 'create' || item.action === 'update')
    );
  } catch {
    return [];
  }
};
