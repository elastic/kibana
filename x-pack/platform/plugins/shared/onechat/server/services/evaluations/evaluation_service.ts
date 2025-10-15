/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Conversation } from '@kbn/onechat-common';
import type {
  EvaluatorConfig,
  ConversationRoundEvaluation,
} from '../../../common/http_api/evaluations';
import { EvaluatorId } from '../../../common/http_api/evaluations';
import type { EvaluatorRegistry } from './types';
import { createRegexEvaluator } from './evaluators';

export interface EvaluationService {
  evaluateConversation(
    conversation: Conversation,
    evaluatorConfigs: EvaluatorConfig[]
  ): Promise<ConversationRoundEvaluation[]>;
}

interface EvaluationServiceDeps {
  logger: Logger;
}

export class EvaluationServiceImpl implements EvaluationService {
  private readonly logger: Logger;
  private readonly evaluators: Partial<EvaluatorRegistry>;

  constructor({ logger }: EvaluationServiceDeps) {
    this.logger = logger;
    this.evaluators = {
      [EvaluatorId.Regex]: createRegexEvaluator(),
    };
  }

  async evaluateConversation(
    conversation: Conversation,
    evaluatorConfigs: EvaluatorConfig[]
  ): Promise<ConversationRoundEvaluation[]> {
    const results: ConversationRoundEvaluation[] = [];

    for (const round of conversation.rounds) {
      const scores = await Promise.all(
        evaluatorConfigs.map(async (config) => {
          const evaluator = this.evaluators[config.evaluatorId];
          let score: number;

          if (evaluator) {
            try {
              score = await evaluator({
                conversation,
                currentRound: round,
                customInstructions: config.customInstructions ?? '',
              });
            } catch (error) {
              this.logger.error(
                `Error running evaluator ${config.evaluatorId} for round ${round.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
              throw error;
            }
          } else {
            score = Math.random();
          }

          return {
            evaluatorId: config.evaluatorIdOverride || config.evaluatorId,
            score,
          };
        })
      );

      results.push({
        roundId: round.id,
        scores,
      });
    }

    return results;
  }
}
