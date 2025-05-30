/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { MessageRole, callPromptUntil } from '@kbn/inference-common';
import { NamedFieldDefinitionConfig } from '@kbn/streams-schema';
import { OnboardingTaskContext, OnboardingTaskState } from '../types';
import { GenerateMappingsPrompt } from './prompt';

export async function generateMappings({
  context: { inferenceClient, signal },
  state,
  state: {
    panels,
    stream: { definition },
    dataset: { analysis },
  },
}: {
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
}): Promise<OnboardingTaskState> {
  const messages = await callPromptUntil({
    inferenceClient,
    prompt: GenerateMappingsPrompt,
    abortSignal: signal,
    strategy: 'next',
    toolCallbacks: {
      suggest_mappings: async (toolCall) => {
        return {};
      },
    },
    input: {
      stream: {
        name: definition.name,
        description: definition.description,
      },
      suggested_queries: JSON.stringify(panels?.map((panel) => panel.query)),
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true })
      ),
    },
  });

  const lastToolCall = messages.findLast(
    (message): message is Extract<typeof message, { role: MessageRole.Assistant }> =>
      Boolean(
        message.role === MessageRole.Assistant &&
          message.toolCalls?.length &&
          message.toolCalls.some((toolCall) => toolCall.function.name === 'suggest_mappings')
      )
  );

  const namedConfigs =
    lastToolCall?.toolCalls.flatMap(
      (toolCall) => toolCall.function.arguments.fields as NamedFieldDefinitionConfig[]
    ) ?? [];

  const addedFields = Object.fromEntries(namedConfigs.map(({ name, ...config }) => [name, config]));

  return {
    ...state,
    stream: {
      ...state.stream,
      definition: {
        ...definition,
        ingest: {
          ...definition.ingest,
          wired: {
            ...definition.ingest.wired,
            fields: {
              ...definition.ingest.wired.fields,
              ...addedFields,
            },
          },
        },
      },
    },
  };
}
