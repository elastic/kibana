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
import type { InternalSetupServices, InternalStartServices } from '../../services';
import { sigeventsSynthesisPrompt } from './sigevents_synthesis_prompt';

export interface RegisterSigeventsMemoryHookDeps {
  logger: Logger;
  getInternalServices: () => InternalStartServices;
}

/**
 * Registers a non-blocking afterToolCall hook that synthesizes knowledge indicators
 * from stream data into architectural memory entries via LLM.
 *
 * When `search_knowledge_indicators` returns results, this hook:
 * 1. Extracts stream names and raw indicators from the tool return
 * 2. Checks existing memory for each stream
 * 3. Asks the LLM to synthesize an architectural summary
 * 4. Writes/updates entries under `architecture/<stream_name>/overview`
 */
export const registerSigeventsMemoryHook = (
  serviceSetups: InternalSetupServices,
  deps: RegisterSigeventsMemoryHookDeps
): void => {
  const logger = deps.logger.get('sigeventsMemory');

  serviceSetups.hooks.register({
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
            const { memory } = deps.getInternalServices();
            const { spaceId, modelProvider } = context.toolHandlerContext;

            const data = dataResult.data as Record<string, unknown>;

            // Extract stream-grouped indicators from the tool output
            const streamGroups = extractStreamGroups(data);
            if (streamGroups.length === 0) {
              return;
            }

            for (const { streamName, indicators } of streamGroups) {
              const memoryPath = `architecture/${streamName}/overview`;

              // Check existing memory
              const existing = await memory.getByPath({
                path: memoryPath,
                space: spaceId,
              });

              const prompt = sigeventsSynthesisPrompt({
                streamName,
                indicators: JSON.stringify(indicators, null, 2),
                existingMemory: existing?.content,
              });

              // Use the model provider to synthesize
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

/**
 * Extracts stream-grouped indicators from the search_knowledge_indicators output.
 * The output shape has `features` and `queries` arrays with `stream_name` on each item.
 */
const extractStreamGroups = (data: Record<string, unknown>): StreamGroup[] => {
  const byStream = new Map<string, unknown[]>();

  const addItems = (items: unknown[]) => {
    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        const streamName = (record.stream_name as string) ?? (record.streamName as string);
        if (streamName) {
          const existing = byStream.get(streamName) ?? [];
          existing.push(item);
          byStream.set(streamName, existing);
        }
      }
    }
  };

  if (Array.isArray(data.features)) {
    addItems(data.features);
  }
  if (Array.isArray(data.queries)) {
    addItems(data.queries);
  }
  if (Array.isArray(data.items)) {
    addItems(data.items);
  }
  if (Array.isArray(data.results)) {
    addItems(data.results);
  }

  return Array.from(byStream.entries()).map(([streamName, indicators]) => ({
    streamName,
    indicators,
  }));
};
