/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { BaseFeature, GeneratedSignificantEventQuery, Insight } from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorForSignificantEventsDiscovery } from '../../../routes/utils/resolve_connector_for_feature';
import {
  MemoryServiceImpl,
  formatExistingPages,
  createReadMemoryPageCallback,
  createWriteMemoryPageCallback,
} from '../../memory';
import { MemorySynthesisPrompt } from './memory_generation_prompt';

export interface MemoryGenerationTaskParams {
  insights?: Insight[];
  features?: BaseFeature[];
  queries?: Array<{ streamName: string; query: GeneratedSignificantEventQuery }>;
}

export interface MemoryGenerationTaskResult {
  streamsProcessed: number;
}

export const MEMORY_GENERATION_TASK_TYPE = 'streams_memory_generation';

export function createStreamsMemoryGenerationTask(taskContext: TaskContext) {
  return {
    [MEMORY_GENERATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { insights, features, queries, _task } = runContext.taskInstance
                .params as TaskParams<MemoryGenerationTaskParams>;

              const { taskClient, inferenceClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('memory_generation');

              const streamGroups = groupInputsByStream({ insights, features, queries });

              if (streamGroups.length === 0) {
                taskLogger.info('No inputs provided, skipping memory generation');
                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights, features, queries },
                  { streamsProcessed: 0 }
                );
                return;
              }

              taskLogger.info(
                `Starting memory generation: ${streamGroups.length} stream(s), ` +
                  `${insights?.length ?? 0} insight(s), ` +
                  `${features?.length ?? 0} feature(s), ` +
                  `${queries?.length ?? 0} query/queries`
              );

              const useMemory = await uiSettingsClient.get<boolean>(
                OBSERVABILITY_STREAMS_ENABLE_MEMORY
              );

              if (!useMemory) {
                taskLogger.info('Memory is disabled, skipping memory generation');
                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights, features, queries },
                  { streamsProcessed: 0 }
                );
                return;
              }

              const connectorId = await resolveConnectorForSignificantEventsDiscovery({
                searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                request: runContext.fakeRequest,
              });
              taskLogger.info(
                `Using connector ${connectorId} for memory generation (discovery model)`
              );

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              try {
                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                const allEntries = await memory.listAll();
                const existingPages = formatExistingPages(allEntries);

                taskLogger.info(`Found ${allEntries.length} existing memory entries total`);

                for (const { streamName, indicators } of streamGroups) {
                  taskLogger.info(
                    `Processing stream "${streamName}" with ${indicators.length} indicator(s) via reasoning agent`
                  );

                  const indicatorSummaries = buildIndicatorSummaries(indicators);

                  let pagesWritten = 0;

                  const writeCallback = createWriteMemoryPageCallback({
                    memory,
                    user: 'agent:memory_generation',
                    logger: taskLogger,
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
                    toolCallbacks: {
                      get_indicator_details: async (toolCall) => {
                        const { index } = toolCall.function.arguments;
                        taskLogger.info(
                          `Stream "${streamName}": agent requesting indicator details for index ${index}`
                        );

                        if (typeof index !== 'number' || index < 0 || index >= indicators.length) {
                          return {
                            response: {
                              error: `Invalid index ${index}. Valid range: 0-${
                                indicators.length - 1
                              }`,
                            },
                          };
                        }

                        return {
                          response: indicators[index] as Record<string, unknown>,
                        };
                      },

                      read_memory_page: createReadMemoryPageCallback({ memory }),

                      write_memory_page: async (toolCall) => {
                        const result = await writeCallback(toolCall);
                        pagesWritten++;
                        return result;
                      },
                    },
                  });

                  taskLogger.info(
                    `Reasoning agent completed for stream "${streamName}": ${pagesWritten} page(s) written, response length: ${response.content.length}`
                  );
                }

                taskLogger.info(
                  `Memory generation completed: processed ${streamGroups.length} stream(s)`
                );

                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights, features, queries },
                  { streamsProcessed: streamGroups.length }
                );
              } catch (error) {
                const errorMessage = getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`);

                await taskClient.fail<MemoryGenerationTaskParams>(
                  _task,
                  { insights, features, queries },
                  errorMessage
                );

                return getDeleteTaskRunResult();
              }
            },
            runContext,
            taskContext
          ),
        };
      },
    },
  } satisfies TaskDefinitionRegistry;
}

interface StreamIndicatorsGroup {
  streamName: string;
  indicators: unknown[];
}

const groupInputsByStream = ({
  insights,
  features,
  queries,
}: Pick<
  MemoryGenerationTaskParams,
  'insights' | 'features' | 'queries'
>): StreamIndicatorsGroup[] => {
  const byStream = new Map<string, unknown[]>();

  const addToStream = (streamName: string, item: unknown) => {
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

/**
 * Build concise one-line summaries for each indicator so the LLM can
 * decide which ones to fetch details for. The index matches the array
 * position used by the `get_indicator_details` tool.
 *
 * Indicators are identified by duck-typing their properties since they
 * come from heterogeneous sources (Insight, BaseFeature, GeneratedSignificantEventQuery)
 * mixed into a single array.
 */
const buildIndicatorSummaries = (indicators: unknown[]): string => {
  return indicators
    .map((indicator, index) => {
      const item = indicator as Record<string, unknown>;

      // Insight: has impact + evidence array
      if ('impact' in item && 'evidence' in item) {
        const title = String(item.title ?? 'Untitled insight');
        const impact = String(item.impact ?? 'unknown');
        return `[${index}] **Insight** (${impact}): ${title}`;
      }

      // Feature: has type + stream_name + confidence
      if ('type' in item && 'stream_name' in item && 'confidence' in item) {
        const title = String(item.title ?? item.id ?? 'Untitled feature');
        const type = String(item.type ?? 'unknown');
        const subtype = item.subtype ? `/${item.subtype}` : '';
        return `[${index}] **Feature** (${type}${subtype}): ${title}`;
      }

      // Query: has esql + severity_score
      if ('esql' in item && 'severity_score' in item) {
        const title = String(item.title ?? 'Untitled query');
        const severity = String(item.severity_score ?? '?');
        return `[${index}] **Query** (severity ${severity}): ${title}`;
      }

      return `[${index}] **Unknown indicator**: ${JSON.stringify(item).slice(0, 100)}`;
    })
    .join('\n');
};
