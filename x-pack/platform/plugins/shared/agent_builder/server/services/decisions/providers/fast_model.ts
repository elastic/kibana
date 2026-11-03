/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { BaseMessageLike } from '@langchain/core/messages';
import { EffortLevels } from '@kbn/agent-builder-common';
import type { DecisionAnswer, DecisionQuestion } from '@kbn/agent-builder-server';
import type { ModelProviderFactoryFn } from '../../execution/runner/model_provider';
import type { DecisionProvider } from './types';
import { DecisionProviderUnavailableError } from './types';

/** The model provider's error when neither a fast nor a default model is configured. */
const NO_CONNECTOR_MESSAGE = 'No connector available';

const confidence = lazySchema(() =>
  z.number().min(0).max(1).describe('How confident you are, from 0 to 1')
);

const toEnum = (values: string[]) => z.enum(values as [string, ...string[]]);

const answerSchema = (question: DecisionQuestion) => {
  switch (question.type) {
    case 'predicate':
      return z.object({
        probability: z
          .number()
          .min(0)
          .max(1)
          .describe('Probability that the answer is yes, from 0 to 1'),
      });
    case 'choice':
      return z.object({ choice: toEnum(Object.keys(question.choices)), confidence });
    case 'score':
      return z.object({ level: toEnum(question.levels.map(({ label }) => label)), confidence });
  }
};

const describeQuestion = (name: string, question: DecisionQuestion): string => {
  switch (question.type) {
    case 'predicate':
      return `- ${name} (yes or no): ${question.instructions}`;
    case 'choice':
      return `- ${name} (pick one): ${question.instructions}\n${Object.entries(question.choices)
        .map(([value, description]) => `  - ${value}: ${description}`)
        .join('\n')}`;
    case 'score':
      return `- ${name} (pick a level): ${question.instructions}\n${question.levels
        .map(({ label, description }) => `  - ${label}: ${description}`)
        .join('\n')}`;
  }
};

interface RawAnswer {
  probability?: number;
  choice?: string;
  level?: string;
  confidence?: number;
}

const toAnswer = (question: DecisionQuestion, raw: RawAnswer): DecisionAnswer => {
  switch (question.type) {
    case 'predicate':
      return { type: 'predicate', probability: raw.probability ?? 0 };
    case 'choice':
      return {
        type: 'choice',
        choice: raw.choice ?? '',
        confidence: raw.confidence ?? 0,
        probabilities: { [raw.choice ?? '']: raw.confidence ?? 0 },
      };
    case 'score':
      return {
        type: 'score',
        score: question.levels.findIndex(({ label }) => label === raw.level),
        confidence: raw.confidence ?? 0,
        probabilities: { [raw.level ?? '']: raw.confidence ?? 0 },
      };
  }
};

/**
 * Answers with Agent Builder's fast model (else its default model) through structured output.
 * The fallback for when no decision model is available or one fails.
 */
export const createFastModelDecisionProvider = ({
  createModelProvider,
}: {
  createModelProvider: ModelProviderFactoryFn;
}): DecisionProvider => ({
  id: 'fast_model',
  decide: async ({ request, input, questions, signal }) => {
    const { chatModel, connector } = await createModelProvider({ request })
      .selectModel({ effortLevel: EffortLevels.low })
      .catch((error: Error) => {
        throw error.message === NO_CONNECTOR_MESSAGE
          ? new DecisionProviderUnavailableError(error.message)
          : error;
      });

    const schema = z.object(
      Object.fromEntries(
        Object.entries(questions).map(([name, question]) => [name, answerSchema(question)])
      )
    );
    const structuredModel = chatModel.withStructuredOutput(schema, { name: 'decide' });

    const prompt: BaseMessageLike[] = [
      [
        'system',
        `You make quick decisions about an input for an automated system. Answer every question below about the input the user sends, by calling the 'decide' tool.

## Questions
${Object.entries(questions)
  .map(([name, question]) => describeQuestion(name, question))
  .join('\n')}`,
      ],
      ['user', input],
    ];

    const output: Record<string, RawAnswer | undefined> = await structuredModel.invoke(prompt, {
      signal,
    });

    const answers = Object.fromEntries(
      Object.entries(questions).map(([name, question]) => {
        const raw = output?.[name];

        if (!raw) {
          throw new Error(`Fast model output has no answer for question [${name}]`);
        }

        return [name, toAnswer(question, raw)];
      })
    );

    return { inferenceId: `fast_model:${connector.connectorId}`, answers };
  },
});
