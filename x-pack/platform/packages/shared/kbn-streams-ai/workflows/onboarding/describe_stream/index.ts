/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { OnboardingTaskContext, OnboardingTaskState } from '../types';
import { DescribeStreamPrompt } from './prompt';

export async function describeStream({
  context: { inferenceClient, signal },
  state,
  state: {
    stream: { definition },
    dataset: { analysis },
  },
}: {
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
}): Promise<OnboardingTaskState> {
  const response = await inferenceClient.prompt({
    prompt: DescribeStreamPrompt,
    abortSignal: signal,
    input: {
      stream: definition,
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true })
      ),
    },
  });

  const description = response.toolCalls[0]?.function.arguments.description;

  return {
    ...state,
    stream: {
      ...state.stream,
      definition: {
        ...state.stream.definition,
        description,
      },
    },
  };
}
