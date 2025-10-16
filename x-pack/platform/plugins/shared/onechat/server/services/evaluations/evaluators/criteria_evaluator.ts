/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { EvaluatorFunction } from '../types';

export const createCriteriaEvaluator = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}): EvaluatorFunction => {
  return async (context) => {
    const { currentRound, customInstructions } = context;

    const criteria =
      typeof customInstructions === 'string' && customInstructions.trim()
        ? customInstructions
        : "The agent provided a clear answer to the user's question";

    const responseMessage = currentRound.response.message;

    try {
      const response = await inferenceClient.chatComplete({
        system: `You are an LLM judge. Your task is to evaluate if an agent's response meets specific criteria.

Evaluate the response and reply with ONLY a number between 0 and 1:
- 1.0 = Fully meets the criteria
- 0.5 = Partially meets the criteria
- 0.0 = Does not meet the criteria

Do not include any explanation, just the numeric score.`,
        messages: [
          {
            role: MessageRole.User,
            content: `Criteria: ${criteria}

Agent Response: ${responseMessage}

Score (0-1):`,
          },
        ],
      });

      const scoreText = response.content.trim();
      const score = parseFloat(scoreText);

      if (isNaN(score)) {
        throw new Error(`Failed to parse LLM response as a number. Received: "${scoreText}"`);
      }

      if (score < 0 || score > 1) {
        throw new Error(`LLM returned score outside valid range [0, 1]. Received: ${score}`);
      }

      return { score };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to parse')) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('outside valid range')) {
        throw error;
      }
      throw new Error(
        `Error calling inference client: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };
};
