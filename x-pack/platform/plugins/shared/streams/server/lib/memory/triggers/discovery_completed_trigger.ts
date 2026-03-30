/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { SigeventsSynthesisPrompt } from '../../../agent_builder/hooks/memory/sigevents_synthesis_prompt';
import { createAskQuestionCallback } from '../ask_question_tool';
import type { MemoryUpdateTrigger } from './types';

export const DISCOVERY_COMPLETED_TRIGGER_ID = 'discovery-completed';

interface DiscoveryInsight {
  title: string;
  evidence: Array<{ stream_name?: string }>;
  [key: string]: unknown;
}

/**
 * Trigger that fires after insights discovery completes.
 * Uses a reasoning agent with memory tools to synthesize
 * new insights into wiki pages.
 *
 * Expected payload: { insights: Array<{ title: string; evidence: Array<{ stream_name?: string }> }> }
 */
export const discoveryCompletedTrigger: MemoryUpdateTrigger = {
  id: DISCOVERY_COMPLETED_TRIGGER_ID,
  description:
    'Fires after insights discovery completes. Synthesizes discovery insights into architecture overview memory entries.',
  execute: async (context) => {
    const { memory, logger, trigger, inferenceClient } = context;
    const { insights } = trigger.payload as {
      insights: DiscoveryInsight[];
    };

    if (!insights || insights.length === 0) {
      logger.debug('No insights to process, skipping');
      return;
    }

    if (!inferenceClient) {
      logger.debug('No inference client available — cannot synthesize insights into memory');
      return;
    }

    const streamGroups = groupInsightsByStream(insights);
    if (streamGroups.length === 0) {
      logger.debug('No stream-specific insights found, skipping');
      return;
    }

    logger.info(
      `Processing ${insights.length} insights across ${streamGroups.length} streams for memory synthesis`
    );

    const allEntries = await memory.listAll();

    for (const { streamName, streamInsights } of streamGroups) {
      try {
        const existingEntries = allEntries.filter(
          (e) =>
            e.path.startsWith(`stream/${streamName}/`) ||
            e.path.startsWith(`architecture/${streamName}/`) ||
            e.path.startsWith(`operations/${streamName}/`)
        );

        const existingPages =
          existingEntries.length > 0
            ? existingEntries.map((e) => `- **${e.path}** — ${e.title}`).join('\n')
            : 'No existing pages for this stream.';

        const user = 'system:discovery-completed-trigger';

        await executeAsReasoningAgent({
          inferenceClient,
          prompt: SigeventsSynthesisPrompt,
          input: {
            streamName,
            indicators: JSON.stringify(streamInsights, null, 2),
            existingPages,
          },
          maxSteps: 10,
          toolCallbacks: {
            read_memory_page: async (toolCall) => {
              const { path } = toolCall.function.arguments;
              const entry = await memory.getByPath({ path });
              if (!entry) {
                return { response: { error: `No page found at path "${path}"` } };
              }
              return {
                response: {
                  path: entry.path,
                  title: entry.title,
                  content: entry.content,
                },
              };
            },

            ask_question: createAskQuestionCallback({
              memory,
              logger,
              user: 'system:discovery-completed-trigger',
            }),

            write_memory_page: async (toolCall) => {
              const { path, title, content, tags } = toolCall.function.arguments;

              const existing = await memory.getByPath({ path });

              if (existing) {
                await memory.update({
                  id: existing.id,
                  content,
                  title,
                  user,
                  changeSummary: 'Updated from discovery insights',
                });
                logger.info(`Updated wiki page: ${path}`);
              } else {
                await memory.create({
                  path,
                  title,
                  content,
                  tags: [...(tags ?? []), 'auto-generated'],
                  user,
                });
                logger.info(`Created wiki page: ${path}`);
              }

              return {
                response: {
                  success: true,
                  action: existing ? 'updated' : 'created',
                  path,
                },
              };
            },
          },
        });

        logger.debug(`Reasoning agent completed synthesis for stream: ${streamName}`);
      } catch (error) {
        logger.warn(
          `Failed to synthesize memory for stream ${streamName}: ${(error as Error).message}`
        );
      }
    }
  },
};

interface StreamInsightsGroup {
  streamName: string;
  streamInsights: DiscoveryInsight[];
}

const groupInsightsByStream = (insights: DiscoveryInsight[]): StreamInsightsGroup[] => {
  const byStream = new Map<string, DiscoveryInsight[]>();

  for (const insight of insights) {
    const streamNames = new Set<string>();
    for (const evidence of insight.evidence ?? []) {
      if (evidence.stream_name) {
        streamNames.add(evidence.stream_name);
      }
    }

    for (const streamName of streamNames) {
      const existing = byStream.get(streamName) ?? [];
      existing.push(insight);
      byStream.set(streamName, existing);
    }
  }

  return Array.from(byStream.entries()).map(([streamName, streamInsights]) => ({
    streamName,
    streamInsights,
  }));
};
