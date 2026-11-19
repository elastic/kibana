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
  createInferenceInternalError,
  createInferenceProviderError,
  createInferenceRequestAbortedError,
  createInferenceRequestError,
  isInferenceError,
  MessageRole,
} from '@kbn/inference-common';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import { getTelemetryHeaders } from '../util/telemetry_headers';
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
 * The free text of a question: its instructions, then its choice or level descriptions. Choice
 * keys and level labels are left out, since answers are keyed by them.
 */
const getQuestionTexts = (question: DecisionQuestion): string[] => {
  switch (question.type) {
    case 'predicate':
      return [question.instructions];

    case 'choice':
      return [question.instructions, ...Object.values(question.choices)];

    case 'score':
      return [question.instructions, ...question.levels.map(({ description }) => description)];
  }
};

/** Returns the question with its free text replaced, in the order of {@link getQuestionTexts}. */
const withQuestionTexts = (
  question: DecisionQuestion,
  [instructions, ...descriptions]: string[]
): DecisionQuestion => {
  switch (question.type) {
    case 'predicate':
      return { ...question, instructions };

    case 'choice':
      return {
        ...question,
        instructions,
        choices: Object.fromEntries(
          Object.keys(question.choices).map((key, index) => [key, descriptions[index]])
        ),
      };

    case 'score':
      return {
        ...question,
        instructions,
        levels: question.levels.map(({ label }, index) => ({
          label,
          description: descriptions[index],
        })),
      };
  }
};

/**
 * Masks the input and the questions' text with the space's anonymization rules, like chat
 * completion does. Answers are probabilities and caller-defined keys, so there's nothing to
 * restore and no replacements to keep.
 */
const anonymizeRequest = async ({
  input,
  questions,
  esClient,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  anonymization,
}: CreateDecideApiOptions & { input: string; questions: DecisionQuestion[] }): Promise<{
  input: string;
  questions: DecisionQuestion[];
}> => {
  const questionTexts = questions.map(getQuestionTexts);

  const { messages } = await anonymizeMessages({
    messages: [input, ...questionTexts.flat()].map((content) => ({
      role: MessageRole.User,
      content,
    })),
    anonymizationRules: await anonymizationRulesPromise,
    regexWorker,
    esClient,
    salt: await anonymization?.saltPromise,
    onFailure: (await anonymization?.onFailurePromise) ?? 'block',
    logger,
  });

  const [maskedInput, ...maskedTexts] = messages.map((message) => {
    if (message.role !== MessageRole.User || typeof message.content !== 'string') {
      throw createInferenceInternalError('Anonymization did not return the decision text as text');
    }

    return message.content;
  });

  return {
    input: maskedInput,
    questions: questions.map((question, index) =>
      withQuestionTexts(question, maskedTexts.splice(0, questionTexts[index].length))
    ),
  };
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
    ...questions: DecisionQuestion[]
  ): Promise<{ answers: DecisionAnswer[] }> => {
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
