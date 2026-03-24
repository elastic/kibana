/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import { platformStreamsSigEventsTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { Logger } from '@kbn/logging';
import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import type { MemoryHookServices } from './types';
import { sigeventsSynthesisPrompt } from './sigevents_synthesis_prompt';

export interface RegisterSigeventsMemoryHookDeps {
  logger: Logger;
  getMemoryServices: () => MemoryHookServices;
}

/**
 * Registers a non-blocking afterToolCall hook that synthesizes knowledge indicators
 * from stream data into architectural memory entries via LLM.
 */
export const registerSigeventsMemoryHook = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: RegisterSigeventsMemoryHookDeps
): void => {
  const logger = deps.logger.get('sigeventsMemory');

  agentBuilder.hooks.register({
    id: 'sigevents-memory-synthesis',
    hooks: {
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: async (context: AfterToolCallHookContext): Promise<void> => {
          if (context.toolId !== platformStreamsSigEventsTools.searchKnowledgeIndicators) {
            return;
          }

          const toolResults = context.toolReturn?.results ?? [];
          const dataResult = toolResults.find((r) => r.type === ToolResultType.other);
          if (!dataResult || !dataResult.data) {
            return;
          }

          try {
            const { memory } = deps.getMemoryServices();
            const { spaceId, modelProvider } = context.toolHandlerContext;

            const data = dataResult.data as Record<string, unknown>;

            const streamGroups = extractStreamGroups(data);
            if (streamGroups.length === 0) {
              return;
            }

            for (const { streamName, indicators } of streamGroups) {
              const memoryPath = `architecture/${streamName}/overview`;

              const existing = await memory.getByPath({
                path: memoryPath,
                space: spaceId,
              });

              const prompt = sigeventsSynthesisPrompt({
                streamName,
                indicators: JSON.stringify(indicators, null, 2),
                existingMemory: existing?.content,
              });

              const { chatModel } = await modelProvider.getDefaultModel();
              const response = await chatModel.invoke([{ role: 'user', content: prompt }]);

              const synthesized =
                typeof response.content === 'string'
                  ? response.content
                  : JSON.stringify(response.content);

              if (!synthesized || synthesized.length < 50) {
                logger.debug(`Skipping empty synthesis for stream ${streamName}`);
                continue;
              }

              const user = `agent:${context.agentId ?? 'system'}`;

              if (existing) {
                await memory.update({
                  id: existing.id,
                  content: synthesized,
                  space: spaceId,
                  user,
                  changeSummary: `Updated architecture overview from knowledge indicators`,
                });
              } else {
                await memory.create({
                  path: memoryPath,
                  title: `${streamName} - Architecture Overview`,
                  content: synthesized,
                  tags: ['architecture', 'auto-generated', streamName],
                  space: spaceId,
                  user,
                });
              }

              logger.debug(`Synthesized memory for stream: ${streamName}`);
            }
          } catch (error) {
            logger.warn(
              `Failed to synthesize memory from knowledge indicators: ${(error as Error).message}`
            );
          }
        },
      },
    },
  });
};

interface StreamGroup {
  streamName: string;
  indicators: unknown[];
}

const extractStreamGroups = (data: Record<string, unknown>): StreamGroup[] => {
  const byStream = new Map<string, unknown[]>();

  const indicators = data.knowledge_indicators;
  if (!Array.isArray(indicators)) {
    return [];
  }

  for (const indicator of indicators) {
    if (typeof indicator !== 'object' || indicator === null) {
      continue;
    }
    const record = indicator as Record<string, unknown>;
    let streamName: string | undefined;
    if (
      record.kind === 'feature' &&
      typeof record.feature === 'object' &&
      record.feature !== null
    ) {
      streamName = (record.feature as Record<string, unknown>).stream_name as string | undefined;
    } else {
      streamName = record.stream_name as string | undefined;
    }

    if (streamName) {
      const existing = byStream.get(streamName) ?? [];
      existing.push(indicator);
      byStream.set(streamName, existing);
    }
  }

  return Array.from(byStream.entries()).map(([streamName, items]) => ({
    streamName,
    indicators: items,
  }));
};
