/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { Conversation } from '@kbn/onechat-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type {
  EvaluatorConfig,
  ConversationRoundEvaluation,
} from '../../../common/http_api/evaluations';
import { EvaluatorId } from '../../../common/http_api/evaluations';
import type { EvaluatorRegistry } from './types';
import {
  createRegexEvaluator,
  createCriteriaEvaluator,
  createGroundednessEvaluator,
  createOptimizerEvaluator,
} from './evaluators';
import type { AgentsServiceStart } from '../agents';
import type { ToolsServiceStart } from '../tools';

export interface EvaluationService {
  evaluateConversation(
    conversation: Conversation,
    evaluatorConfigs: EvaluatorConfig[],
    request: KibanaRequest
  ): Promise<ConversationRoundEvaluation[]>;
}

interface EvaluationServiceDeps {
  logger: Logger;
  inference: InferenceServerStart;
  agentsService: AgentsServiceStart;
  toolsService: ToolsServiceStart;
}

export class EvaluationServiceImpl implements EvaluationService {
  private readonly logger: Logger;
  private readonly inference: InferenceServerStart;
  private readonly agentsService: AgentsServiceStart;
  private readonly toolsService: ToolsServiceStart;

  constructor({ logger, inference, agentsService, toolsService }: EvaluationServiceDeps) {
    this.logger = logger;
    this.inference = inference;
    this.agentsService = agentsService;
    this.toolsService = toolsService;
  }

  async evaluateConversation(
    conversation: Conversation,
    evaluatorConfigs: EvaluatorConfig[],
    request: KibanaRequest
  ): Promise<ConversationRoundEvaluation[]> {
    const defaultConnector = await this.inference.getDefaultConnector(request);
    const inferenceClient = this.inference.getClient({
      request,
      bindTo: { connectorId: defaultConnector.connectorId },
    });

    const evaluators: Partial<EvaluatorRegistry> = {
      [EvaluatorId.Regex]: createRegexEvaluator(),
      [EvaluatorId.Criteria]: createCriteriaEvaluator({ inferenceClient }),
      [EvaluatorId.Groundedness]: createGroundednessEvaluator({
        inferenceClient,
        logger: this.logger,
      }),
      [EvaluatorId.Optimizer]: createOptimizerEvaluator({
        inferenceClient,
        logger: this.logger,
        agentsService: this.agentsService,
        toolsService: this.toolsService,
        request,
      }),
    };

    const results = await Promise.all(
      conversation.rounds.map(async (round) => {
        const scores = await Promise.all(
          evaluatorConfigs.map(async (config) => {
            const evaluator = evaluators[config.evaluatorId];

            if (evaluator) {
              try {
                const result = await evaluator({
                  conversation,
                  currentRound: round,
                  customInstructions: config.customInstructions ?? '',
                });

                return {
                  evaluatorId: config.evaluatorIdOverride || config.evaluatorId,
                  score: result.score,
                  ...(result.analysis && { analysis: result.analysis }),
                };
              } catch (error) {
                this.logger.error(
                  `Error running evaluator ${config.evaluatorId} for round ${round.id}: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
                throw error;
              }
            } else {
              return {
                evaluatorId: config.evaluatorIdOverride || config.evaluatorId,
                score: Math.random(),
              };
            }
          })
        );

        return {
          roundId: round.id,
          scores,
        };
      })
    );

    return results;
  }
}
