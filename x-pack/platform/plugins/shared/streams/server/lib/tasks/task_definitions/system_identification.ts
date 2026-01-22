/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { getStreamTypeFromDefinition } from '@kbn/streams-schema';
import type { IdentifySystemsResult } from '@kbn/streams-ai';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';
import { identifySystemsWithDescription } from '../../streams/system/identify_systems';

export interface SystemIdentificationTaskParams {
  connectorId: string;
  start: number;
  end: number;
}

export const SYSTEMS_IDENTIFICATION_TASK_TYPE = 'streams_systems_identification';

export function getSystemsIdentificationTaskId(streamName: string) {
  return `${SYSTEMS_IDENTIFICATION_TASK_TYPE}_${streamName}`;
}

export function createStreamsSystemIdentificationTask(taskContext: TaskContext) {
  return {
    [SYSTEMS_IDENTIFICATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, start, end, _task } = runContext.taskInstance
                .params as TaskParams<SystemIdentificationTaskParams>;
              const { stream: name } = _task;

              const {
                taskClient,
                scopedClusterClient,
                systemClient,
                streamsClient,
                inferenceClient,
                soClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              try {
                const [{ systems: currentSystems }, stream] = await Promise.all([
                  systemClient.getSystems(name),
                  streamsClient.getStream(name),
                ]);

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;

                const promptsConfigService = new PromptsConfigService({
                  soClient,
                  logger: taskContext.logger,
                });

                const { descriptionPromptOverride, systemsPromptOverride } =
                  await promptsConfigService.getPrompt();

                const { systems, tokensUsed } = await identifySystemsWithDescription({
                  start,
                  end,
                  esClient,
                  inferenceClient: boundInferenceClient,
                  logger: taskContext.logger.get('system_identification'),
                  stream,
                  systems: currentSystems,
                  signal: runContext.abortController.signal,
                  descriptionPrompt: descriptionPromptOverride,
                  systemsPrompt: systemsPromptOverride,
                  dropUnmapped: true,
                });

                taskContext.telemetry.trackSystemsIdentified({
                  count: systems.length,
                  stream_name: stream.name,
                  stream_type: getStreamTypeFromDefinition(stream),
                  input_tokens_used: tokensUsed.prompt,
                  output_tokens_used: tokensUsed.completion,
                });

                await taskClient.complete<
                  SystemIdentificationTaskParams,
                  Pick<IdentifySystemsResult, 'systems'>
                >(_task, { connectorId, start, end }, { systems });
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

                await taskClient.fail<SystemIdentificationTaskParams>(
                  _task,
                  { connectorId, start, end },
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
