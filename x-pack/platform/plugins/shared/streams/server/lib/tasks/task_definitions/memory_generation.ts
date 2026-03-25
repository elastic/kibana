/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { MessageRole } from '@kbn/inference-common';
import type { Insight } from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorId } from '../../../routes/utils/resolve_connector_id';
import { MemoryServiceImpl } from '../../memory';
import { sigeventsSynthesisPrompt } from '../../../agent_builder/hooks/memory/sigevents_synthesis_prompt';

export interface MemoryGenerationTaskParams {
  insights: Insight[];
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

              const { insights, _task } = runContext.taskInstance
                .params as TaskParams<MemoryGenerationTaskParams>;

              const { taskClient, inferenceClient, modelSettingsClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('memory_generation');

              if (!insights || insights.length === 0) {
                taskLogger.debug('No insights provided, skipping memory generation');
                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights },
                  { streamsProcessed: 0 }
                );
                return;
              }

              const settings = await modelSettingsClient.getSettings();
              const connectorId = await resolveConnectorId({
                connectorId: settings.connectorIdDiscovery,
                uiSettingsClient,
                logger: taskLogger,
              });
              taskLogger.debug(`Using connector ${connectorId} for memory generation`);

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              try {
                const streamGroups = groupInsightsByStream(insights);
                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                for (const { streamName, streamInsights } of streamGroups) {
                  const memoryPath = `architecture/${streamName}/overview`;
                  const spaceId = 'default';

                  const existing = await memory.getByPath({
                    path: memoryPath,
                    space: spaceId,
                  });

                  const indicators = JSON.stringify(streamInsights, null, 2);

                  const prompt = sigeventsSynthesisPrompt({
                    streamName,
                    indicators,
                    existingMemory: existing?.content,
                  });

                  const response = await boundInferenceClient.chatComplete({
                    messages: [{ role: MessageRole.User, content: prompt }],
                  });

                  const synthesized = response.content;

                  if (!synthesized || synthesized.length < 50) {
                    taskLogger.debug(`Skipping empty synthesis for stream ${streamName}`);
                    continue;
                  }

                  const user = 'agent:memory_generation';

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

                  taskLogger.debug(`Synthesized memory for stream: ${streamName}`);
                }

                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights },
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

                taskLogger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`
                );

                await taskClient.fail<MemoryGenerationTaskParams>(
                  _task,
                  { insights },
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

interface StreamInsightsGroup {
  streamName: string;
  streamInsights: Insight[];
}

const groupInsightsByStream = (insights: Insight[]): StreamInsightsGroup[] => {
  const byStream = new Map<string, Insight[]>();

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
