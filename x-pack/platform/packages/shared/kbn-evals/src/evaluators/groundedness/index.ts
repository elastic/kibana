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
import { LlmGroundednessEvaluationPrompt } from './prompt';
import { calculateGroundednessScore } from './scoring';
import type { GroundednessAnalysis } from './types';
import { parseSelectedEvaluators } from '../filter';

const QUALITATIVE_EVALUATOR_NAME = 'Groundedness Analysis';
const QUANTITATIVE_EVALUATOR_NAME = 'Groundedness';

/**
 * Avoiding cost and lantecy by running qualitative analysis only when either qualitative or quantitative evaluator for groundedness is selected,
 */
function shouldRunGroundednessAnalysis() {
  const evaluatorSelection = parseSelectedEvaluators();

  return (
    // Default to running qualitative analysis if no specific evaluators are selected
    !evaluatorSelection ||
    evaluatorSelection.includes(QUALITATIVE_EVALUATOR_NAME) ||
    evaluatorSelection.includes(QUANTITATIVE_EVALUATOR_NAME)
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
      if (!shouldRunGroundednessAnalysis()) {
        return {};
      }

      async function runGroundednessAnalysis(): Promise<GroundednessAnalysis> {
        const userQuery = (input as any)?.question;
        const messages = (output as any)?.messages ?? [];
        const latestMessage = messages[messages.length - 1]?.message;
        const steps = (output as any)?.steps ?? [];

        const response = await inferenceClient.prompt({
          prompt: LlmGroundednessEvaluationPrompt,
          input: {
            user_query: `${userQuery}`,
            agent_response: `${latestMessage}`,
            tool_call_history: JSON.stringify(steps),
          },
          // toolChoice must be specified in the API call, as `createPrompt` currently discards it from the prompt definition
          toolChoice: {
            function: 'analyze',
          } as ToolChoice,
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
    name: QUALITATIVE_EVALUATOR_NAME,
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
          metadata: metadata ?? undefined,
        };
      }

      const score = calculateGroundednessScore(groundednessAnalysis);
      const summaryText = groundednessAnalysis.summary_verdict;

      return {
        score,
        label: summaryText,
        explanation: summaryText,
        metadata: metadata ?? undefined,
      };
    },
    kind: 'LLM',
    name: QUANTITATIVE_EVALUATOR_NAME,
  };
}
