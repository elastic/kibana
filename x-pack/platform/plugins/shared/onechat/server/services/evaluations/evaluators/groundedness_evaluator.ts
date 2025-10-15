/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { isToolCallStep } from '@kbn/onechat-common';
import {
  LlmGroundednessEvaluationPrompt,
  calculateGroundednessScore,
  type GroundednessAnalysis,
} from '@kbn/evals';
import type { EvaluatorFunction } from '../types';

export const createGroundednessEvaluator = ({
  inferenceClient,
  logger,
}: {
  inferenceClient: BoundInferenceClient;
  logger: Logger;
}): EvaluatorFunction => {
  return async (context): Promise<number> => {
    const { currentRound } = context;

    const userQuery = currentRound.input.message;
    const agentResponse = currentRound.response.message;

    const toolCallHistory = currentRound.steps.filter(isToolCallStep).map((step) => ({
      tool_call_id: step.tool_call_id,
      tool_id: step.tool_id,
      params: step.params,
      results: step.results,
    }));

    if (toolCallHistory.length === 0) {
      logger.debug('No tool calls found in conversation round for groundedness evaluation');
      return 1.0;
    }

    try {
      const response = await inferenceClient.prompt({
        prompt: LlmGroundednessEvaluationPrompt,
        input: {
          user_query: userQuery,
          agent_response: agentResponse,
          tool_call_history: JSON.stringify(toolCallHistory),
        },
      });

      const toolCall = response.toolCalls?.[0];
      if (!toolCall) {
        throw new Error('No tool call found in LLM response for groundedness evaluation');
      }

      const analysis: GroundednessAnalysis = toolCall.function.arguments;

      const score = calculateGroundednessScore(analysis);

      return score;
    } catch (error) {
      logger.error(
        `Error in groundedness evaluation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  };
};
