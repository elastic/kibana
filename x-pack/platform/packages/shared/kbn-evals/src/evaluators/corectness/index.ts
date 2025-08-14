/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoundInferenceClient } from '@kbn/inference-common';
import { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import { Evaluator } from '../../types';
import { LlmCorrectnessEvaluationPrompt } from './prompt';
import { CorrectnessAnalysis } from './types';

export function createCorrectnessEvaluator({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator {
  return {
    evaluate: async ({ input, output, expected }) => {
      async function runCorrectnessAnalysis(): Promise<CorrectnessAnalysis> {
        const response = await inferenceClient.prompt({
          prompt: LlmCorrectnessEvaluationPrompt,
          input: {
            user_query: JSON.stringify(input),
            agent_response: JSON.stringify(output),
            ground_truth_response: JSON.stringify(expected),
          },
        });

        // Extract the correctness evaluation from the tool call
        const toolCall = response.toolCalls[0];
        if (!toolCall) {
          throw new Error('No tool call found in LLM response');
        }

        return toolCall.function.arguments;
      }

      const correctnessAnalysisResult = await pRetry(runCorrectnessAnalysis, {
        retries: 0,
        onFailedAttempt: (error) => {
          log.error(new Error(`Failed to score correctness task`, { cause: error }));
        },
      });

      const summary = correctnessAnalysisResult.summary;
      const explanation = `Factuality: ${summary.factual_accuracy_summary}, Relevance: ${summary.relevance_summary}, Sequence: ${summary.sequence_accuracy_summary}`;

      return {
        score: null,
        label: 'correctness-analysis',
        explanation,
        metadata: { ...correctnessAnalysisResult },
      };
    },
    kind: 'LLM',
    name: 'correctness',
  };
}
