/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
import { LlmGroundednessEvaluationPrompt } from './prompt';
import { calculateGroundednessScore } from './scoring';
import type { GroundednessAnalysis } from './types';
import { boundToolCallHistory } from './bound_transcript';
import { parseSelectedEvaluators } from '../filter';
import { UNAVAILABLE_LABEL } from '../unavailable';

const QUALITATIVE_EVALUATOR_NAME = 'Groundedness Analysis';
const QUANTITATIVE_EVALUATOR_NAME = 'Groundedness';

export { UNAVAILABLE_LABEL };

/** Judge retries after the first attempt, so at most `MAX_JUDGE_RETRIES + 1` calls per cell. */
const MAX_JUDGE_RETRIES = 3;

/**
 * Avoiding cost and lantecy by running qualitative analysis only when either qualitative or quantitative evaluator for groundedness is selected,
 */
function shouldRunGroundednessAnalysis() {
  const evaluatorSelection = parseSelectedEvaluators();

  return (
    // Default to running qualitative analysis if no specific evaluators are selected
    evaluatorSelection.length === 0 ||
    evaluatorSelection.includes(QUALITATIVE_EVALUATOR_NAME) ||
    evaluatorSelection.includes(QUANTITATIVE_EVALUATOR_NAME)
  );
}

const getStatus = (error: unknown): number | undefined => {
  const candidate = error as
    | { status?: unknown; statusCode?: unknown; cause?: unknown }
    | undefined;
  const status = candidate?.status ?? candidate?.statusCode;
  if (typeof status === 'number') {
    return status;
  }
  return candidate?.cause && candidate.cause !== error ? getStatus(candidate.cause) : undefined;
};

const describeError = (error: unknown): string => {
  const status = getStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  return `${status !== undefined ? `HTTP ${status}: ` : ''}${message}`.slice(0, 300);
};

/**
 * A 413 is deterministic — the same transcript composes the same oversized body — so retrying it
 * only burns judge calls before the cell ends up unscored anyway. Transient judge failures (a
 * missing tool call, a malformed response, a transport error) and 408/429/5xx keep the retry.
 */
const isRetryableJudgeError = (error: unknown): boolean => {
  const status = getStatus(error);
  if (status !== undefined) {
    return status === 408 || status === 429 || status >= 500;
  }
  return true;
};

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

      const userQuery = (input as any)?.question;
      const messages = (output as any)?.messages ?? [];
      const latestMessage = messages[messages.length - 1]?.message;
      const steps = (output as any)?.steps ?? [];

      // The judge reads the whole tool-call history, and one tool result can embed megabytes.
      // Bound the copy the judge sees so the request stays inside the inference body cap.
      const { json: toolCallHistory, report } = boundToolCallHistory(steps);
      if (report.bounded) {
        log.warning(
          `Groundedness judge transcript bounded to fit the inference body cap: ${report.originalBytes} -> ${report.boundedBytes} bytes (budget ${report.budgetBytes}; shortened ${report.shortenedValues} tool result(s), dropped ${report.droppedSteps} oldest step(s))`
        );
      }

      const runGroundednessAnalysis = async (): Promise<GroundednessAnalysis> => {
        const response = await inferenceClient.prompt({
          prompt: LlmGroundednessEvaluationPrompt,
          input: {
            user_query: `${userQuery}`,
            agent_response: `${latestMessage}`,
            tool_call_history: toolCallHistory,
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
      };

      // Every failure here is the judge's, never the candidate's: the task already finished.
      // Retry the transient ones a bounded number of times, then record the cell as unavailable
      // instead of throwing — a throw out of this evaluator discards every evaluator's score for
      // the run and fails the spec.
      const failures: string[] = [];
      for (let attempt = 0; attempt <= MAX_JUDGE_RETRIES; attempt++) {
        try {
          const groundednessAnalysisResult = await runGroundednessAnalysis();

          return {
            score: null,
            label: 'groundedness-analysis',
            explanation: groundednessAnalysisResult.summary_verdict,
            metadata: {
              ...groundednessAnalysisResult,
              ...(report.bounded && { judgeTranscript: report }),
            },
          };
        } catch (error) {
          failures.push(describeError(error));
          if (!isRetryableJudgeError(error)) {
            break;
          }
          if (attempt < MAX_JUDGE_RETRIES) {
            log.warning(
              new Error(
                `Groundedness analysis returned an invalid or missing tool call on attempt ${
                  attempt + 1
                }; retrying...`,
                { cause: error }
              )
            );
          }
        }
      }

      log.error(
        new Error(
          `Failed to retrieve groundedness analysis after ${
            failures.length
          } attempt(s): ${failures.join('; ')}`
        )
      );

      return {
        score: null,
        label: UNAVAILABLE_LABEL,
        explanation: `Groundedness analysis unavailable after ${
          failures.length
        } attempt(s): ${failures.join('; ')}`.slice(0, 1000),
        metadata: {
          judgeAttempts: failures.length,
          judgeFailures: failures,
          ...(report.bounded && { judgeTranscript: report }),
        },
      };
    },
    kind: 'LLM',
    direction: 'maximize',
    name: QUALITATIVE_EVALUATOR_NAME,
  };
}

export function createQuantitativeGroundednessEvaluator(): Evaluator {
  return {
    evaluate: async ({ output, metadata }) => {
      const groundednessAnalysis =
        ((output as any)?.groundednessAnalysis as GroundednessAnalysis) || null;

      // An unavailable marker (judge failures) is not an analysis. Scoring it would fabricate a
      // 0.0 from a missing `analysis` array and deflate the metric instead of recording the cell
      // as unscored.
      if (!groundednessAnalysis || !Array.isArray(groundednessAnalysis.analysis)) {
        return {
          score: null,
          label: UNAVAILABLE_LABEL,
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
        metadata: { ...(metadata ?? {}), groundednessAnalysis },
      };
    },
    kind: 'LLM',
    direction: 'maximize',
    name: QUANTITATIVE_EVALUATOR_NAME,
  };
}
