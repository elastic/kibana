/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { Evaluator } from '@kbn/evals';
import {
  LlmCorrectnessEvaluationPrompt,
  calculateFactualScore,
  calculateRelevanceScore,
  selectEvaluators,
} from '@kbn/evals';
import type { CorrectnessAnalysis } from '@kbn/evals';

interface SigeventsCorrectnessConfig<TInput = unknown, TOutput = unknown, TExpected = unknown> {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  extractContext: (input: TInput, metadata: unknown) => string;
  extractResponse: (output: TOutput) => string;
  extractGroundTruth: (expected: TExpected) => string;
}

/**
 * Creates Factuality and Relevance evaluators adapted for Sigevents structured
 * outputs (features arrays, query arrays) rather than the chat-message format
 * the core correctness evaluators expect.
 *
 * Both evaluators share a single LLM analysis call via a cached promise - when
 * they run in parallel inside `KibanaEvalsClient.runExperiment`, the first to
 * execute triggers the analysis and the second awaits the same result.
 */
export const createCorrectnessEvaluators = <
  TInput = unknown,
  TOutput = unknown,
  TExpected = unknown
>({
  inferenceClient,
  log,
  extractContext,
  extractResponse,
  extractGroundTruth,
}: SigeventsCorrectnessConfig<TInput, TOutput, TExpected>): Evaluator[] => {
  const analysisCache = new Map<string, Promise<CorrectnessAnalysis | null>>();

  const getAnalysis = (
    input: TInput,
    output: TOutput,
    expected: TExpected,
    metadata: unknown
  ): Promise<CorrectnessAnalysis | null> => {
    const userQuery = extractContext(input, metadata);
    const agentResponse = extractResponse(output);
    const groundTruth = extractGroundTruth(expected);
    const cacheKey = `${userQuery}\0${agentResponse}\0${groundTruth}`;

    const cached = analysisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const promise = (async (): Promise<CorrectnessAnalysis | null> => {
      if (!agentResponse) {
        return null;
      }

      async function runAnalysis(): Promise<CorrectnessAnalysis> {
        const response = await inferenceClient.prompt({
          prompt: LlmCorrectnessEvaluationPrompt,
          input: {
            user_query: userQuery,
            agent_response: agentResponse,
            ground_truth_response: groundTruth,
          },
          toolChoice: { function: 'analyze' } as ToolChoice,
        });

        const toolCall = response.toolCalls[0];
        if (!toolCall) {
          throw new Error('No tool call found in LLM correctness analysis response');
        }
        return toolCall.function.arguments;
      }

      return pRetry(runAnalysis, {
        retries: 3,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.retriesLeft === 0;
          if (isLastAttempt) {
            log.error(
              new Error(
                `Sigevents correctness analysis failed after ${error.attemptNumber} attempts`,
                { cause: error }
              )
            );
          } else {
            log.warning(
              new Error(
                `Sigevents correctness analysis attempt ${error.attemptNumber} failed; retrying...`,
                { cause: error }
              )
            );
          }
        },
      });
    })();

    analysisCache.set(cacheKey, promise);
    return promise;
  };

  const factuality: Evaluator = {
    name: 'Factuality',
    kind: 'LLM',
    evaluate: async ({ input, output, expected, metadata }) => {
      const analysis = await getAnalysis(
        input as TInput,
        output as TOutput,
        expected as TExpected,
        metadata
      );

      if (!analysis) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No output to evaluate for factuality',
        };
      }

      const score = calculateFactualScore(analysis);
      return {
        score,
        label: analysis.summary.factual_accuracy_summary,
        explanation: `Factuality: ${analysis.summary.factual_accuracy_summary}`,
        metadata: { analysis },
      };
    },
  };

  const relevance: Evaluator = {
    name: 'Relevance',
    kind: 'LLM',
    evaluate: async ({ input, output, expected, metadata }) => {
      const analysis = await getAnalysis(
        input as TInput,
        output as TOutput,
        expected as TExpected,
        metadata
      );

      if (!analysis) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No output to evaluate for relevance',
        };
      }

      const score = calculateRelevanceScore(analysis);
      return {
        score,
        label: analysis.summary.relevance_summary,
        explanation: `Relevance: ${analysis.summary.relevance_summary}`,
        metadata: { analysis },
      };
    },
  };

  return selectEvaluators([factuality, relevance]);
};
