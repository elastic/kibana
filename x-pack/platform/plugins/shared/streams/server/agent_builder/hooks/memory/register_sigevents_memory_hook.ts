/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import { platformStreamsSigEventsTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import type { RegisterMemoryHooksDeps } from './types';
import { sigeventsSynthesisPrompt, parseSynthesisResponse } from './sigevents_synthesis_prompt';

/**
 * Registers a non-blocking afterToolCall hook that synthesizes knowledge indicators
 * from stream data into architectural memory entries via LLM.
 */
export const registerSigeventsMemoryHook = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: RegisterMemoryHooksDeps
): void => {
  const logger = deps.logger.get('sigeventsMemory');

  agentBuilder.hooks.register({
    id: 'sigevents-memory-synthesis',
    hooks: {
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: async (context: AfterToolCallHookContext): Promise<void> => {
          if (!(await deps.isMemoryEnabled())) {
            return;
          }

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

            const allEntries = await memory.listAll({ space: spaceId });

            for (const { streamName, indicators: streamIndicators } of streamGroups) {
              const existingEntries = allEntries
                .filter(
                  (e) =>
                    e.path.startsWith(`architecture/${streamName}/`) ||
                    e.path.startsWith(`operations/${streamName}/`)
                )
                .map((e) => ({ path: e.path, title: e.title, content: e.content }));

              const prompt = sigeventsSynthesisPrompt({
                streamName,
                indicators: JSON.stringify(streamIndicators, null, 2),
                existingEntries: existingEntries.length > 0 ? existingEntries : undefined,
              });

              const { chatModel } = await modelProvider.getDefaultModel();
              const response = await chatModel.invoke([{ role: 'user', content: prompt }]);

              const synthesized =
                typeof response.content === 'string'
                  ? response.content
                  : JSON.stringify(response.content);

              if (!synthesized || synthesized.length < 20) {
                logger.debug(`Skipping empty synthesis for stream ${streamName}`);
                continue;
              }

              const pages = parseSynthesisResponse(synthesized);
              if (pages.length === 0) {
                logger.debug(`No valid wiki pages parsed for stream ${streamName}`);
                continue;
              }

              const user = `agent:${context.agentId ?? 'system'}`;

              for (const page of pages) {
                const existing = await memory.getByPath({
                  path: page.path,
                  space: spaceId,
                });

                if (existing) {
                  await memory.update({
                    id: existing.id,
                    content: page.content,
                    title: page.title,
                    space: spaceId,
                    user,
                    changeSummary: 'Updated from knowledge indicators',
                  });
                } else {
                  await memory.create({
                    path: page.path,
                    title: page.title,
                    content: page.content,
                    tags: [...page.tags, 'auto-generated'],
                    space: spaceId,
                    user,
                  });
                }
              }

              logger.debug(`Synthesized ${pages.length} wiki pages for stream: ${streamName}`);
            }

            // Schedule discovery-completed trigger for additional memory processing
            if (deps.scheduleMemoryTask) {
              try {
                await deps.scheduleMemoryTask(
                  'discovery-completed',
                  {
                    insights: streamGroups.flatMap((g) => g.indicators),
                    source: 'ki-exploration-hook',
                  },
                  context.toolHandlerContext.request
                );
                logger.debug('Scheduled memory update task for discovery-completed trigger');
              } catch (scheduleError) {
                logger.debug(
                  `Failed to schedule memory update task (non-fatal): ${
                    (scheduleError as Error).message
                  }`
                );
              }
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
