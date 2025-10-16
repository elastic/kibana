/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  ListEvaluatorsResponse,
  EvaluationRunResponse,
} from '../../common/http_api/evaluations';
import { EvaluatorId } from '../../common/http_api/evaluations';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';

export function registerEvaluationRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .get({
      path: `${publicApiPath}/evaluators`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'List available evaluators',
      description: 'Get the list of available evaluator IDs that can be used for evaluations.',
      options: {
        tags: ['evaluation', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {},
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/evaluations_list.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        return response.ok<ListEvaluatorsResponse>({
          body: {
            evaluators: [
              {
                id: EvaluatorId.Relevance,
                name: 'Relevance Evaluator',
                description: 'Evaluates how relevant the response is to the input query',
                type: 'text',
              },
              {
                id: EvaluatorId.Groundedness,
                name: 'Groundedness Evaluator',
                description: 'Checks if the response is grounded in the provided context',
                type: 'text',
              },
              {
                id: EvaluatorId.Recall,
                name: 'Recall Evaluator',
                description: 'Measures how well the response recalls relevant information',
                type: 'number',
              },
              {
                id: EvaluatorId.Precision,
                name: 'Precision Evaluator',
                description: 'Assesses the precision and accuracy of the response',
                type: 'number',
              },
              {
                id: EvaluatorId.Regex,
                name: 'Regex Evaluator',
                description: 'Uses regex patterns to validate response format',
                type: 'text',
              },
              {
                id: EvaluatorId.Criteria,
                name: 'Criteria Evaluator',
                description: 'Evaluates response against custom criteria using LLM as a judge',
                type: 'text',
              },
            ],
          },
        });
      })
    );

  router.versioned
    .post({
      path: `${publicApiPath}/evaluations`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Run evaluations on a conversation',
      description:
        'Execute evaluation metrics on a specific conversation using the provided evaluators.',
      options: {
        tags: ['evaluation', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              conversationId: schema.string({
                meta: {
                  description: 'The ID of the conversation to evaluate.',
                },
              }),
              evaluators: schema.arrayOf(
                schema.object({
                  evaluatorId: schema.oneOf([
                    schema.literal(EvaluatorId.Relevance),
                    schema.literal(EvaluatorId.Groundedness),
                    schema.literal(EvaluatorId.Recall),
                    schema.literal(EvaluatorId.Precision),
                    schema.literal(EvaluatorId.Regex),
                    schema.literal(EvaluatorId.Criteria),
                  ]),
                  evaluatorIdOverride: schema.maybe(
                    schema.string({
                      meta: {
                        description:
                          'Optional custom identifier to override the default evaluator ID in the results.',
                      },
                    })
                  ),
                  customInstructions: schema.oneOf([schema.string(), schema.number()], {
                    meta: {
                      description: 'Custom instructions or parameters for the evaluator.',
                    },
                  }),
                }),
                {
                  meta: {
                    description: 'List of evaluators to run on the conversation.',
                  },
                }
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/evaluations_run.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversationId, evaluators } = request.body;
        const { conversations: conversationsService, evaluations } = getInternalServices();

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const results = await evaluations.evaluateConversation(conversation, evaluators, request);

        const updatedRounds = conversation.rounds.map((round) => {
          const roundEvaluation = results.find((r) => r.roundId === round.id);
          return {
            ...round,
            evaluations: roundEvaluation?.scores || [],
          };
        });

        await client.update({
          id: conversationId,
          rounds: updatedRounds,
        });

        return response.ok<EvaluationRunResponse>({
          body: {
            conversationId,
            results,
          },
        });
      })
    );
}
