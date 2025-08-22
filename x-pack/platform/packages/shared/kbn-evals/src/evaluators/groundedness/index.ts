/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { Evaluator } from '../../types';
import { LlmGroundednessEvaluationPrompt } from './prompt';
import { calculateGroundednessScore } from './scoring';
import type { GroundednessAnalysis } from './types';

// Type guard to check if output has the expected structure (keeping the original for compatibility)
function hasMessagesAndSteps(output: unknown): output is { messages: unknown[]; steps: unknown[] } {
  return (
    typeof output === 'object' &&
    output !== null &&
    'messages' in output &&
    'steps' in output &&
    Array.isArray((output as any).messages) &&
    Array.isArray((output as any).steps)
  );
}

export function createGroundednessAnalysisEvaluator({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator {
  return {
    evaluate: async ({ input, output }) => {
      async function runGroundednessAnalysis(): Promise<GroundednessAnalysis> {
        // Validate that output has the expected structure
        if (!hasMessagesAndSteps(output)) {
          throw new Error(
            'Invalid output format: expected object with "messages" and "steps" arrays'
          );
        }

        const response = await inferenceClient.prompt({
          prompt: LlmGroundednessEvaluationPrompt,
          input: {
            user_query: JSON.stringify(input),
            agent_response: JSON.stringify(output.messages),
            tool_call_history: JSON.stringify(output.steps),
          },
        });

        // Extract the groundedness evaluation from the tool call
        const toolCall = response.toolCalls[0];
        if (!toolCall) {
          throw new Error('No tool call found in LLM response');
        }

        return toolCall.function.arguments;
      }

      const groundednessAnalysisResult = await pRetry(runGroundednessAnalysis, {
        retries: 3,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

          if (isLastAttempt) {
            log.error(
              new Error(
                `Failed to retrieve groundedness analysis after ${error.attemptNumber} attempts (no valid tool call or malformed response)`,
                {
                  cause: error,
                }
              )
            );
          } else {
            log.warning(
              new Error(
                `Groundedness analysis returned an invalid or missing tool call on attempt ${error.attemptNumber}; retrying...`,
                {
                  cause: error,
                }
              )
            );
          }
        },
      });

      const explanation = groundednessAnalysisResult.summary_verdict;

      return {
        score: null,
        label: 'groundedness-analysis',
        explanation,
        metadata: { ...groundednessAnalysisResult },
      };
    },
    kind: 'LLM',
    name: 'Groundedness Analysis',
  };
}

export function createQuantitativeGroundednessEvaluator(): Evaluator {
  return {
    evaluate: async ({ output, metadata }) => {
      const groundednessAnalysis =
        ((output as any)?.groundednessAnalysis as GroundednessAnalysis) || null;

      if (!groundednessAnalysis) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No groundedness analysis available',
          metadata,
        };
      }

      const score = calculateGroundednessScore(groundednessAnalysis);
      const summaryText = groundednessAnalysis.summary_verdict;

      return {
        score,
        label: summaryText,
        explanation: summaryText,
        metadata,
      };
    },
    kind: 'LLM',
    name: 'Groundedness',
  };
}
