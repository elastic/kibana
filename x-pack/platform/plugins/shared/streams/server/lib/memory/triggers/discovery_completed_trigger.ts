/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sigeventsSynthesisPrompt } from '../../../agent_builder/hooks/memory/sigevents_synthesis_prompt';
import type { MemoryUpdateTrigger } from './types';

export const DISCOVERY_COMPLETED_TRIGGER_ID = 'discovery-completed';

interface DiscoveryInsight {
  title: string;
  evidence: Array<{ stream_name?: string }>;
  [key: string]: unknown;
}

/**
 * Trigger that fires after insights discovery completes.
 * Synthesizes new insights into memory entries using the same prompt
 * pattern as the memory_generation task.
 *
 * Expected payload: { insights: Array<{ title: string; evidence: Array<{ stream_name?: string }> }> }
 */
export const discoveryCompletedTrigger: MemoryUpdateTrigger = {
  id: DISCOVERY_COMPLETED_TRIGGER_ID,
  description:
    'Fires after insights discovery completes. Synthesizes discovery insights into architecture overview memory entries.',
  execute: async (context) => {
    const { memory, spaceId, logger, trigger, output } = context;
    const { insights } = trigger.payload as {
      insights: DiscoveryInsight[];
    };

    if (!insights || insights.length === 0) {
      logger.debug('No insights to process, skipping');
      return;
    }

    if (!output) {
      logger.debug('No LLM output function available — cannot synthesize insights into memory');
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

    for (const { streamName, streamInsights } of streamGroups) {
      try {
        const memoryPath = `architecture/${streamName}/overview`;

        const existing = await memory.getByPath({
          path: memoryPath,
          space: spaceId,
        });

        const prompt = sigeventsSynthesisPrompt({
          streamName,
          indicators: JSON.stringify(streamInsights, null, 2),
          existingMemory: existing?.content,
        });

        const synthesized = await output(prompt);

        if (!synthesized || synthesized.length < 50) {
          logger.debug(`Skipping empty synthesis for stream ${streamName}`);
          continue;
        }

        const user = 'system:discovery-completed-trigger';

        if (existing) {
          await memory.update({
            id: existing.id,
            content: synthesized,
            space: spaceId,
            user,
            changeSummary: 'Updated architecture overview from discovery insights',
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
