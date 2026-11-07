/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import pRetry from 'p-retry';
import type { Evaluator } from '../../types';
import { EsqlEquivalencePrompt } from './prompt';
import type { EsqlEquivalenceAnalysis } from './types';

type EsqlPredictionExtractor<T = unknown> = (output: T) => string;
type EsqlGroundTruthExtractor<T = unknown> = (expected: T) => string;

export const ESQL_EQUIVALENCE_EVALUATOR_NAME = 'ES|QL Functional Equivalence';

export function createEsqlEquivalenceEvaluator({
  inferenceClient,
  log,
  predictionExtractor,
  groundTruthExtractor,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  predictionExtractor: EsqlPredictionExtractor;
  groundTruthExtractor: EsqlGroundTruthExtractor;
}): Evaluator {
  return {
    evaluate: async ({ output, expected }) => {
      const prediction = predictionExtractor(output);
      const groundTruth = groundTruthExtractor(expected);

      if (!groundTruth) {
        return {
          explanation: 'Missing ground truth query; cannot compare',
          label: 'error',
          score: null,
          metadata: {
            reason: 'Missing ground truth query for comparison',
          },
        };
      }

      if (!prediction) {
        return {
          explanation: 'Missing prediction query',
          label: 'No',
          score: 0,
          metadata: {
            equivalent: false,
            reason: 'Missing prediction query for comparison',
          },
        };
      }

      async function runEsqlEquivalenceAnalysis(): Promise<EsqlEquivalenceAnalysis> {
        const response = await executeUntilValid({
          prompt: EsqlEquivalencePrompt,
          inferenceClient,
          input: {
            ground_truth: groundTruth,
            prediction,
          },
          finalToolChoice: {
            function: 'evaluate',
          },
          maxRetries: 3,
          toolCallbacks: {
            evaluate: async (toolCall) => {
              const { equivalent, reason } = toolCall.function.arguments;
              return {
                response: {
                  equivalent,
                  reason,
                },
              };
            },
          },
        });

        return response.toolCalls[0].function.arguments;
      }

      let analysis: EsqlEquivalenceAnalysis;
      try {
        analysis = await pRetry(runEsqlEquivalenceAnalysis, {
          retries: 3,
          onFailedAttempt: (error) => {
            const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

            if (isLastAttempt) {
              log.error(
                new Error(
                  `Failed to retrieve ES|QL equivalence analysis after ${error.attemptNumber} attempts (no valid tool call or malformed response)`,
                  {
                    cause: error,
                  }
                )
              );
            } else {
              log.warning(
                new Error(
                  `ES|QL equivalence analysis returned an invalid or missing tool call on attempt ${error.attemptNumber}; retrying...`,
                  {
                    cause: error,
                  }
                )
              );
            }
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // The ingest API caps `evaluator.explanation` at 4096 characters; returning a longer
        // one here would reject the whole score document instead of recording the failure.
        // The ingest API caps `evaluator.explanation` at 4096 characters; returning a longer
        // one here would reject the whole score document instead of recording the failure.
        const explanation = `ES|QL equivalence analysis failed: ${message}`.slice(0, 4096);
        return {
          score: null,
          label: 'error',
          explanation,
        };
      }

      const { equivalent, reason } = analysis;
      const isEquivalent = equivalent?.trim().toLowerCase() === 'yes';
      return {
        explanation: reason,
        label: isEquivalent ? 'Equivalent ES|QL query' : 'Non-equivalent ES|QL query',
        score: Number(isEquivalent),
        metadata: {
          equivalent,
          reason,
        },
      };
    },
    kind: 'LLM',
    direction: 'maximize',
    name: ESQL_EQUIVALENCE_EVALUATOR_NAME,
  };
}
