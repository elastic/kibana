/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AnonymizationRule } from '@kbn/ai-anonymization-common';
import type {
  InferenceAnonymizationOptions,
  RegexWorkerService,
} from '@kbn/ai-anonymization-server';
import type {
  DecideAPI,
  DecideOptions,
  DecisionAnswer,
  DecisionQuestion,
} from '@kbn/inference-common';
import {
  createInferenceProviderError,
  createInferenceRequestAbortedError,
  createInferenceRequestError,
  isInferenceError,
} from '@kbn/inference-common';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import { getTelemetryHeaders } from '../util/telemetry_headers';
import { anonymizeRequest } from './anonymize_request';
import { parseDecisionResponse, questionKey } from './parse_decision_response';

interface CreateDecideApiOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  anonymization?: InferenceAnonymizationOptions;
}

type QuestionArgs = DecisionQuestion[] | [readonly DecisionQuestion[]];

const isQuestionList = (args: QuestionArgs): args is [readonly DecisionQuestion[]] =>
  Array.isArray(args[0]);

const toKeyedQuestions = (
  questions: readonly DecisionQuestion[]
): Record<string, DecisionQuestion> =>
  Object.fromEntries(questions.map((question, index) => [questionKey(index), question]));

/** Maps Elasticsearch errors to inference errors. */
const toInferenceError = ({
  error,
  options: { inferenceId, abortSignal },
}: {
  error: Error;
  options: DecideOptions;
}): Error => {
  if (isInferenceError(error)) {
    return error;
  }

  if (abortSignal?.aborted || error instanceof errors.RequestAbortedError) {
    return createInferenceRequestAbortedError();
  }

  if (error instanceof errors.ResponseError) {
    const { statusCode } = error.meta;

    if (statusCode === 404) {
      return createInferenceRequestError(`Inference endpoint '${inferenceId}' not found`, 404);
    }

    if (statusCode === 401 || statusCode === 403) {
      return createInferenceRequestError(error.message, statusCode);
    }

    return createInferenceProviderError(error.message, { status: statusCode ?? undefined });
  }

  return createInferenceProviderError(error.message);
};

/** Sends the questions to the `decision` inference task and reads the answers back. */
const invokeDecision = async ({
  esClient,
  options: { input, inferenceId, abortSignal, metadata },
  questions,
}: {
  esClient: ElasticsearchClient;
  options: DecideOptions;
  questions: DecisionQuestion[];
}): Promise<DecisionAnswer[]> => {
  if (abortSignal?.aborted) {
    throw createInferenceRequestAbortedError();
  }

  const body = await esClient.transport.request(
    {
      method: 'POST',
      path: `/_inference/decision/${encodeURIComponent(inferenceId)}`,
      body: { input, task_settings: { questions: toKeyedQuestions(questions) } },
    },
    { signal: abortSignal, headers: getTelemetryHeaders(metadata?.connectorTelemetry) }
  );

  return parseDecisionResponse(body, questions);
};

/**
 * Creates the `decide` API, which calls the Elasticsearch `decision` inference task as the
 * user `esClient` is scoped to.
 */
export function createDecideApi(opts: CreateDecideApiOptions): DecideAPI;
export function createDecideApi({
  esClient,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  anonymization,
}: CreateDecideApiOptions) {
  return async (
    options: DecideOptions,
    ...args: QuestionArgs
  ): Promise<{ answers: DecisionAnswer[] }> => {
    const questions = isQuestionList(args) ? [...args[0]] : args;

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
          if (options.abortSignal?.aborted) {
            throw createInferenceRequestAbortedError();
          }

          const masked = await anonymizeRequest({
            input: options.input,
            questions,
            esClient,
            logger,
            anonymizationRulesPromise,
            regexWorker,
            anonymization,
          });

          const answers = await invokeDecision({
            esClient,
            options: { ...options, input: masked.input },
            questions: masked.questions,
          });

          span?.setAttributes({ 'elastic.decision.inference_id': options.inferenceId });

          logger.debug(
            () =>
              `Decision [${questionTypes}] from [${options.inferenceId}] in ${
                Date.now() - startedAt
              }ms: ${JSON.stringify(answers)}`
          );

          return { answers };
        } catch (error) {
          const inferenceError = toInferenceError({ error, options });

          logger.debug(
            `Decision [${questionTypes}] failed after ${Date.now() - startedAt}ms: ${
              inferenceError.message
            }`
          );

          throw inferenceError;
        }
      }
    );
  };
}
