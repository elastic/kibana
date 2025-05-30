/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { MessageRole, callPromptUntil } from '@kbn/inference-common';
import { OnboardingTaskContext, OnboardingTaskState } from '../types';
import { GeneratePanels } from './prompt';

export async function generatePanels({
  context: { inferenceClient, signal },
  state,
  state: {
    stream: { definition },
    dataset: { samples, analysis },
  },
}: {
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
}): Promise<OnboardingTaskState> {
  const messages = await callPromptUntil({
    inferenceClient,
    prompt: GeneratePanels,
    abortSignal: signal,
    strategy: 'next',
    toolCallbacks: {
      suggest_panels: async () => {
        return {};
      },
    },
    input: {
      stream: {
        name: definition.name,
        description: definition.description,
      },
      sample_documents: JSON.stringify(samples.slice(0, 10).map((hit) => hit._source)),
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true })
      ),
    },
  });

  const lastToolCall = messages.findLast(
    (message): message is Extract<typeof message, { role: MessageRole.Assistant }> =>
      Boolean(message.role === MessageRole.Assistant && message.toolCalls?.length)
  );

  const panels =
    lastToolCall?.toolCalls.flatMap((toolCall) => toolCall.function.arguments.panels) ?? [];

  return {
    ...state,
    panels,
  };
}
