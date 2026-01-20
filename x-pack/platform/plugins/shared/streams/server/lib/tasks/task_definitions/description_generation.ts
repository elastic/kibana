/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { getStreamTypeFromDefinition } from '@kbn/streams-schema';
import { generateStreamDescription } from '@kbn/streams-ai';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';

export const DESCRIPTION_GENERATION_TASK_TYPE = 'streams_description_generation';

export function getDescriptionGenerationTaskId(streamName: string) {
  return `${DESCRIPTION_GENERATION_TASK_TYPE}_${streamName}`;
}

export interface DescriptionGenerationTaskParams {
  connectorId: string;
  start: number;
  end: number;
}

export interface GenerateDescriptionResult {
  description: string;
}

export function createStreamsDescriptionGenerationTask(taskContext: TaskContext) {
  return {
    [DESCRIPTION_GENERATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, start, end, _task } = runContext.taskInstance
                .params as TaskParams<DescriptionGenerationTaskParams>;
              const { stream: name } = _task;

              const { taskClient, scopedClusterClient, streamsClient, inferenceClient, soClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const promptsConfigService = new PromptsConfigService({
                soClient,
                logger: taskContext.logger,
              });

              try {
                const { descriptionPromptOverride } = await promptsConfigService.getPrompt();
                const stream = await streamsClient.getStream(name);

                const { description, tokensUsed } = await generateStreamDescription({
                  stream,
                  esClient: scopedClusterClient.asCurrentUser,
                  inferenceClient: inferenceClient.bindTo({ connectorId }),
                  start,
                  end,
                  signal: runContext.abortController.signal,
                  logger: taskContext.logger.get('stream_description'),
                  systemPrompt: descriptionPromptOverride,
                });

                taskContext.telemetry.trackDescriptionGenerated({
                  stream_name: stream.name,
                  stream_type: getStreamTypeFromDefinition(stream),
                  input_tokens_used: tokensUsed?.prompt ?? 0,
                  output_tokens_used: tokensUsed?.completion ?? 0,
                });

                await taskClient.complete<
                  DescriptionGenerationTaskParams,
                  GenerateDescriptionResult
                >(_task, { connectorId, start, end }, { description });
              } catch (error) {
                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : error.message;

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return;
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`
                );

                await taskClient.fail<DescriptionGenerationTaskParams>(
                  _task,
                  {
                    connectorId,
                    start,
                    end,
                  },
                  errorMessage
                );
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
