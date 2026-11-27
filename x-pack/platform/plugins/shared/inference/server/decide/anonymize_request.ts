/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AnonymizationRule } from '@kbn/ai-anonymization-common';
import type {
  InferenceAnonymizationOptions,
  RegexWorkerService,
} from '@kbn/ai-anonymization-server';
import { anonymizeMessages } from '@kbn/ai-anonymization-server';
import type { DecisionQuestion } from '@kbn/inference-common';
import { createInferenceInternalError, isInferenceError, MessageRole } from '@kbn/inference-common';

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
 * restore and no replacements to keep. Throws an inference internal error when masking fails.
 */
export const anonymizeRequest = async ({
  input,
  questions,
  esClient,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  anonymization,
}: {
  input: string;
  questions: readonly DecisionQuestion[];
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  anonymization?: InferenceAnonymizationOptions;
}): Promise<{ input: string; questions: DecisionQuestion[] }> => {
  try {
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
        throw createInferenceInternalError(
          'Anonymization did not return the decision text as text'
        );
      }

      return message.content;
    });

    return {
      input: maskedInput,
      questions: questions.map((question, index) =>
        withQuestionTexts(question, maskedTexts.splice(0, questionTexts[index].length))
      ),
    };
  } catch (error) {
    throw isInferenceError(error)
      ? error
      : createInferenceInternalError(`Anonymization failed: ${error.message}`);
  }
};
