/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { SigeventsSynthesisPrompt } from '../../../agent_builder/hooks/memory/sigevents_synthesis_prompt';
import {
  formatExistingPages,
  createReadMemoryPageCallback,
  createWriteMemoryPageCallback,
} from '../tool_callbacks';
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
 * new insights into wiki pages organized by categories.
 *
 * Expected payload: { insights: Array<{ title: string; evidence: Array<{ stream_name?: string }> }> }
 */
export const discoveryCompletedTrigger: MemoryUpdateTrigger = {
  id: DISCOVERY_COMPLETED_TRIGGER_ID,
  description:
    'Fires after insights discovery completes. Synthesizes discovery insights into wiki pages organized by categories.',
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
        const existingPages = formatExistingPages(allEntries);

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
            read_memory_page: createReadMemoryPageCallback({ memory }),
            write_memory_page: createWriteMemoryPageCallback({
              memory,
              user,
              logger,
              changeSummary: 'Updated from discovery insights',
            }),
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
