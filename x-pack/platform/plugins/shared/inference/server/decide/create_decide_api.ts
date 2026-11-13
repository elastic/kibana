/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  DecideAPI,
  DecideOptions,
  DecideResponse,
  DecisionAnswer,
  DecisionAnswerFor,
  DecisionAnswersFor,
  DecisionQuestion,
} from '@kbn/inference-common';
import {
  createInferenceProviderError,
  createInferenceRequestAbortedError,
  createInferenceRequestError,
  isInferenceError,
} from '@kbn/inference-common';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import { parseDecisionResponse } from './parse_decision_response';
import { toKeyedQuestions } from './question_keys';

interface DecisionEndpointsResponse {
  endpoints?: Array<{ inference_id: string }>;
}

/**
 * Creates the `decide` API, which calls the Elasticsearch `decision` inference task as the
 * user `esClient` is scoped to.
 */
export const createDecideApi = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): DecideAPI => {
  /** The given inference id, else the first `decision` endpoint the cluster lists. */
  const resolveInferenceId = async (
    inferenceId: string | undefined,
    signal?: AbortSignal
  ): Promise<string> => {
    if (inferenceId) {
      return inferenceId;
    }

    const { endpoints = [] } = await esClient.transport.request<DecisionEndpointsResponse>(
      { method: 'GET', path: '/_inference/decision/_all' },
      { signal }
    );
    const [first] = endpoints;

    if (!first) {
      throw createInferenceRequestError('No decision inference endpoint on the cluster', 404);
    }

    return first.inference_id;
  };

  /** Maps Elasticsearch errors: a missing endpoint or task type is a 404 request error. */
  const toInferenceError = (error: Error, signal?: AbortSignal): Error => {
    if (isInferenceError(error)) {
      return error;
    }

    if (signal?.aborted || error instanceof errors.RequestAbortedError) {
      return createInferenceRequestAbortedError();
    }

    if (error instanceof errors.ResponseError) {
      const { statusCode, body } = error.meta;

      if (
        statusCode === 404 ||
        (statusCode === 400 && JSON.stringify(body).includes('task_type'))
      ) {
        return createInferenceRequestError(error.message, 404);
      }

      return createInferenceProviderError(error.message, { status: statusCode ?? undefined });
    }

    return createInferenceProviderError(error.message);
  };

  const ask = async (
    { input, inferenceId: requestedInferenceId, abortSignal }: DecideOptions,
    questions: DecisionQuestion[]
  ): Promise<DecideResponse<{ answers: DecisionAnswer[] }>> => {
    if (abortSignal?.aborted) {
      throw createInferenceRequestAbortedError();
    }

    const inferenceId = await resolveInferenceId(requestedInferenceId, abortSignal);

    const body = await esClient.transport.request(
      {
        method: 'POST',
        path: `/_inference/decision/${encodeURIComponent(inferenceId)}`,
        body: { input, task_settings: { questions: toKeyedQuestions(questions) } },
      },
      { signal: abortSignal }
    );

    return { inferenceId, answers: parseDecisionResponse(body, questions) };
  };

  function decide<const Q extends DecisionQuestion>(
    options: DecideOptions,
    question: Q
  ): Promise<DecideResponse<{ answer: DecisionAnswerFor<Q> }>>;
  function decide<const Q extends [DecisionQuestion, DecisionQuestion, ...DecisionQuestion[]]>(
    options: DecideOptions,
    ...questions: Q
  ): Promise<DecideResponse<{ answers: DecisionAnswersFor<Q> }>>;
  async function decide(
    options: DecideOptions,
    ...questions: DecisionQuestion[]
  ): Promise<DecideResponse<{ answer: DecisionAnswer } | { answers: DecisionAnswer[] }>> {
    if (questions.length === 0) {
      throw createInferenceRequestError('decide() needs at least one question', 400);
    }

    const questionTypes = questions.map(({ type }) => type).join(', ');

    return withActiveInferenceSpan(
      'Decide',
      { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'LLM' } },
      async (span) => {
        const startedAt = Date.now();

        try {
          const { inferenceId, answers } = await ask(options, questions);

          span?.setAttributes({ 'elastic.decision.inference_id': inferenceId });

          logger.debug(
            () =>
              `Decision [${questionTypes}] from [${inferenceId}] in ${
                Date.now() - startedAt
              }ms: ${JSON.stringify(answers)}`
          );

          return questions.length === 1
            ? { inferenceId, answer: answers[0] }
            : { inferenceId, answers };
        } catch (error) {
          const inferenceError = toInferenceError(error, options.abortSignal);

          logger.debug(
            `Decision [${questionTypes}] failed after ${Date.now() - startedAt}ms: ${
              inferenceError.message
            }`
          );

          throw inferenceError;
        }
      }
    );
  }

  return decide;
};
