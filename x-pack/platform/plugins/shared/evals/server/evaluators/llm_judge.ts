/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, Prompt, ToolChoice } from '@kbn/inference-common';
import pRetry from 'p-retry';

const getFirstToolCallArguments = <T>(response: {
  toolCalls?: Array<{ function: { arguments: unknown } }>;
}): T | undefined => response.toolCalls?.[0]?.function.arguments as T | undefined;

export const runLlmJudge = async <TOutput>({
  inferenceClient,
  prompt,
  input,
  toolName,
  retries = 3,
}: {
  inferenceClient: BoundInferenceClient;
  prompt: Prompt;
  input: Record<string, unknown>;
  toolName: string;
  retries?: number;
}): Promise<TOutput> => {
  const response = await pRetry(
    async () => {
      return inferenceClient.prompt({
        prompt,
        input,
        stream: false,
        toolChoice: { function: toolName } as ToolChoice,
      });
    },
    { retries }
  );

  const output = getFirstToolCallArguments<TOutput>(response);
  if (!output) {
    throw new Error('No tool call in judge response');
  }
  return output;
};
