/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, InferenceClient } from '@kbn/inference-common';
import type { BaseFeature, GeneratedSignificantEventQuery, Insight } from '@kbn/streams-schema';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { EMPTY_TOKENS, sumTokens } from '@kbn/streams-ai';
import {
  MemoryServiceImpl,
  formatExistingPages,
  createReadMemoryPageCallback,
  createWriteMemoryPageCallback,
} from '../memory';
import { MemorySynthesisPrompt } from '../tasks/task_definitions/memory_generation_prompt';

export interface MemoryGenerationParams {
  insights?: Insight[];
  features?: BaseFeature[];
  queries?: Array<{ streamName: string; query: GeneratedSignificantEventQuery }>;
}

export interface MemoryGenerationResult {
  streamsProcessed: number;
  tokensUsed: ChatCompletionTokenCount;
}

interface MemoryGenerationDependencies {
  inferenceClient: InferenceClient;
  connectorId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
}

type MemoryIndicator = Insight | BaseFeature | GeneratedSignificantEventQuery;

interface StreamIndicatorsGroup {
  streamName: string;
  indicators: MemoryIndicator[];
}

export async function generateMemory(
  params: MemoryGenerationParams,
  deps: MemoryGenerationDependencies
): Promise<MemoryGenerationResult> {
  const { inferenceClient, connectorId, esClient, logger, signal } = deps;
  const { insights, features, queries } = params;

  const streamGroups = groupInputsByStream({ insights, features, queries });

  if (streamGroups.length === 0) {
    logger.info('No inputs provided, skipping memory generation');
    return { streamsProcessed: 0, tokensUsed: EMPTY_TOKENS };
  }

  logger.info(
    `Starting memory generation: ${streamGroups.length} stream(s), ` +
      `${insights?.length ?? 0} insight(s), ` +
      `${features?.length ?? 0} feature(s), ` +
      `${queries?.length ?? 0} query/queries`
  );

  const boundInferenceClient = inferenceClient.bindTo({ connectorId });

  const memory = new MemoryServiceImpl({
    logger: logger.get('memory'),
    esClient,
  });

  const allEntries = await memory.listAll();
  const existingPages = formatExistingPages(allEntries);

  logger.info(`Found ${allEntries.length} existing memory entries total`);

  let totalTokens = EMPTY_TOKENS;

  for (const { streamName, indicators } of streamGroups) {
    if (signal.aborted) {
      throw new Error('Request was aborted');
    }

    logger.info(
      `Processing stream "${streamName}" with ${indicators.length} indicator(s) via reasoning agent`
    );

    const indicatorSummaries = buildIndicatorSummaries(indicators);

    let pagesWritten = 0;

    const writeCallback = createWriteMemoryPageCallback({
      memory,
      user: 'agent:memory_generation',
      logger,
      changeSummary: 'Updated from discovery indicators',
    });

    const response = await executeAsReasoningAgent({
      inferenceClient: boundInferenceClient,
      prompt: MemorySynthesisPrompt,
      input: {
        streamName,
        indicatorCount: indicators.length,
        indicatorSummaries,
        existingPages,
      },
      maxSteps: 10,
      abortSignal: signal,
      toolCallbacks: {
        get_indicator_details: async (toolCall) => {
          const { index } = toolCall.function.arguments;
          logger.info(
            `Stream "${streamName}": agent requesting indicator details for index ${index}`
          );

          if (typeof index !== 'number' || index < 0 || index >= indicators.length) {
            return {
              response: {
                error: `Invalid index ${index}. Valid range: 0-${indicators.length - 1}`,
              },
            };
          }

          const indicator: Record<string, unknown> = { ...indicators[index] };
          return { response: indicator };
        },

        read_memory_page: createReadMemoryPageCallback({ memory }),

        write_memory_page: async (toolCall) => {
          const result = await writeCallback(toolCall);
          pagesWritten++;
          return result;
        },
      },
    });

    totalTokens = sumTokens({ accumulated: totalTokens, added: response.tokens });

    logger.info(
      `Reasoning agent completed for stream "${streamName}": ${pagesWritten} page(s) written, response length: ${response.content.length}`
    );
  }

  logger.info(`Memory generation completed: processed ${streamGroups.length} stream(s)`);

  return {
    streamsProcessed: streamGroups.length,
    tokensUsed: totalTokens,
  };
}

const groupInputsByStream = ({
  insights,
  features,
  queries,
}: Pick<MemoryGenerationParams, 'insights' | 'features' | 'queries'>): StreamIndicatorsGroup[] => {
  const byStream = new Map<string, MemoryIndicator[]>();

  const addToStream = (streamName: string, item: MemoryIndicator) => {
    const existing = byStream.get(streamName) ?? [];
    existing.push(item);
    byStream.set(streamName, existing);
  };

  for (const insight of insights ?? []) {
    const streamNames = new Set<string>();
    for (const evidence of insight.evidence ?? []) {
      if (evidence.stream_name) {
        streamNames.add(evidence.stream_name);
      }
    }
    for (const streamName of streamNames) {
      addToStream(streamName, insight);
    }
  }

  for (const feature of features ?? []) {
    addToStream(feature.stream_name, feature);
  }

  for (const { streamName, query } of queries ?? []) {
    addToStream(streamName, query);
  }

  return Array.from(byStream.entries()).map(([streamName, indicators]) => ({
    streamName,
    indicators,
  }));
};

const buildIndicatorSummaries = (indicators: MemoryIndicator[]): string => {
  return indicators
    .map((item, index) => {
      if ('impact' in item && 'evidence' in item) {
        const title = item.title ?? 'Untitled insight';
        return `[${index}] **Insight** (${item.impact}): ${title}`;
      }

      if ('type' in item && 'stream_name' in item && 'confidence' in item) {
        const title = item.title ?? item.id ?? 'Untitled feature';
        const subtype = item.subtype ? `/${item.subtype}` : '';
        return `[${index}] **Feature** (${item.type}${subtype}): ${title}`;
      }

      if ('esql' in item && 'severity_score' in item) {
        const title = item.title ?? 'Untitled query';
        return `[${index}] **Query** (severity ${item.severity_score}): ${title}`;
      }

      return `[${index}] **Unknown indicator**: ${JSON.stringify(item).slice(0, 100)}`;
    })
    .join('\n');
};
