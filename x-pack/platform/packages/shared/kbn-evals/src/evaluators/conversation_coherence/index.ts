/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { Evaluator } from '../../types';
import { LlmCoherenceEvaluationPrompt } from './prompt';

export function createConversationCoherenceEvaluator(config: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator {
  const { inferenceClient, log } = config;

  return {
    name: 'conversation-coherence',
    kind: 'LLM',
    evaluate: async ({ output }) => {
      const conversation = typeof output === 'string' ? output : JSON.stringify(output, null, 2);

      async function runCoherenceAnalysis() {
        const response = await inferenceClient.prompt({
          prompt: LlmCoherenceEvaluationPrompt,
          input: { conversation },
          toolChoice: { function: 'score_coherence' } as ToolChoice,
        });

        const toolCall = response.toolCalls[0];
        if (!toolCall) {
          throw new Error('No tool call found in LLM response');
        }

        return toolCall.function.arguments;
      }

      const scores = await pRetry(runCoherenceAnalysis, {
        retries: 3,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;
          if (isLastAttempt) {
            log.error(
              new Error(
                `Failed to retrieve coherence analysis after ${error.attemptNumber} attempts`,
                { cause: error }
              )
            );
          } else {
            log.warning(
              new Error(
                `Coherence analysis attempt ${error.attemptNumber} failed; retrying...`,
                { cause: error }
              )
            );
          }
        },
      });

      const overallScore =
        (scores.topic_consistency +
          scores.context_retention +
          scores.contradiction_score +
          scores.resolution_quality) /
        4;

      return {
        score: overallScore,
        label: overallScore >= 0.8 ? 'coherent' : overallScore >= 0.5 ? 'partial' : 'incoherent',
        explanation: [
          `Topic consistency: ${scores.topic_consistency}`,
          `Context retention: ${scores.context_retention}`,
          `Contradiction score: ${scores.contradiction_score}`,
          `Resolution quality: ${scores.resolution_quality}`,
          `Reasoning: ${scores.reasoning}`,
        ].join('. '),
        reasoning: scores.reasoning,
        metadata: {
          topic_consistency: scores.topic_consistency,
          context_retention: scores.context_retention,
          contradiction_score: scores.contradiction_score,
          resolution_quality: scores.resolution_quality,
        },
      };
    },
  };
}
