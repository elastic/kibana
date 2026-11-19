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
import { anonymizeMessages } from '@kbn/ai-anonymization-server';
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
  MessageRole,
} from '@kbn/inference-common';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import { parseDecisionResponse, questionKey } from './parse_decision_response';

interface CreateDecideApiOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  anonymization?: InferenceAnonymizationOptions;
}

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

    return createInferenceProviderError(error.message, { status: statusCode ?? undefined });
  }

  return createInferenceProviderError(error.message);
};

/**
 * Masks the input with the space's anonymization rules, like chat completion does. Answers are
 * probabilities and caller-defined keys, so there's nothing to restore and no replacements to keep.
 */
const anonymizeInput = async ({
  input,
  esClient,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  anonymization,
}: CreateDecideApiOptions & { input: string }): Promise<string> => {
  const {
    messages: [masked],
  } = await anonymizeMessages({
    messages: [{ role: MessageRole.User, content: input }],
    anonymizationRules: await anonymizationRulesPromise,
    regexWorker,
    esClient,
    salt: await anonymization?.saltPromise,
    onFailure: (await anonymization?.onFailurePromise) ?? 'block',
    logger,
  });

  if (masked?.role !== MessageRole.User || typeof masked.content !== 'string') {
    throw createInferenceProviderError('Anonymization did not return the decision input as text');
  }

  return masked.content;
};

/** Sends the questions to the `decision` inference task and reads the answers back. */
const invokeDecision = async ({
  esClient,
  options: { input, inferenceId, abortSignal },
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
    { signal: abortSignal }
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
    ...questions: DecisionQuestion[]
  ): Promise<{ answer: DecisionAnswer } | { answers: DecisionAnswer[] }> => {
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

          const input = await anonymizeInput({
            input: options.input,
            esClient,
            logger,
            anonymizationRulesPromise,
            regexWorker,
            anonymization,
          });

          const answers = await invokeDecision({
            esClient,
            options: { ...options, input },
            questions,
          });

          span?.setAttributes({ 'elastic.decision.inference_id': options.inferenceId });

          logger.debug(
            () =>
              `Decision [${questionTypes}] from [${options.inferenceId}] in ${
                Date.now() - startedAt
              }ms: ${JSON.stringify(answers)}`
          );

          return questions.length === 1 ? { answer: answers[0] } : { answers };
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
