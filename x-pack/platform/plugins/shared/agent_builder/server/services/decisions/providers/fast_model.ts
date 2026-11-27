/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EffortLevels } from '@kbn/agent-builder-common';
import type {
  DecisionAnswer,
  DecisionQuestion,
  ToolSchema,
  ToolSchemaType,
} from '@kbn/inference-common';
import type { ModelProviderFactoryFn } from '../../execution/runner/model_provider';
import type { BaseDecisionProviderOptions } from './base_decision_provider';
import { BaseDecisionProvider } from './base_decision_provider';
import type { DecisionProviderParams, DecisionProviderResult } from './types';
import { DecisionProviderUnavailableError } from './types';

const NO_CONNECTOR_MESSAGE = 'No connector available';

const CALIBRATION_RULES = `## How to give probabilities
- Probabilities say how likely each answer is to be right. They are used to decide whether to act on your answer, so a wrong answer with a high probability is worse than an honest middle value.
- Use the whole range. Go above 0.9 only when no reasonable reader would answer differently.
- When the input is ambiguous or two answers are both plausible, keep the top probability between 0.5 and 0.8 and give the runner-up the rest.
- For questions with options, give every option a probability; they add up to 1.`;

interface RawAnswer {
  probability?: number;
  probabilities?: Record<string, number>;
}

/** The key a question is asked under in the prompt and the output schema. */
const questionKey = (index: number): string => `question_${index + 1}`;

const probability = (description: string): ToolSchemaType => ({
  type: 'number',
  description: `${description}, from 0 to 1`,
});

/**
 * Answers with Agent Builder's fast model (else its default model), through the inference
 * client's structured output. Slower and less calibrated than a decision model: the fallback.
 */
export class FastModelDecisionProvider extends BaseDecisionProvider {
  readonly id = 'fast_model';

  private readonly createModelProvider: ModelProviderFactoryFn;

  constructor({
    createModelProvider,
    ...options
  }: BaseDecisionProviderOptions & { createModelProvider: ModelProviderFactoryFn }) {
    super(options);
    this.createModelProvider = createModelProvider;
  }

  protected async ask({
    request,
    input,
    questions,
    signal,
  }: DecisionProviderParams): Promise<DecisionProviderResult> {
    const { inferenceClient, connector } = await this.createModelProvider({ request })
      .selectModel({ effortLevel: EffortLevels.low })
      .catch((error: Error) => {
        throw error.message === NO_CONNECTOR_MESSAGE
          ? new DecisionProviderUnavailableError(error.message)
          : error;
      });

    const { output } = await inferenceClient.output({
      id: 'decide',
      system: `You make quick decisions about an input for an automated system. Answer every question below about the input the user sends.

${CALIBRATION_RULES}

## Questions
${questions
  .map((question, index) => this.describeQuestion(questionKey(index), question))
  .join('\n')}`,
      input,
      schema: this.outputSchema(questions),
      abortSignal: signal,
      // A retry would not fit in the provider's timeout; the next provider is the retry.
      retry: { onValidationError: false },
    });

    const answers = questions.map((question, index) => {
      const name = questionKey(index);
      const raw = (output as Record<string, RawAnswer | undefined> | undefined)?.[name];

      if (!raw) {
        throw new Error(`Fast model output has no answer for question [${name}]`);
      }

      return this.toAnswer(question, raw);
    });

    return { inferenceId: `fast_model:${connector.connectorId}`, answers };
  }

  private outputSchema(questions: readonly DecisionQuestion[]): ToolSchema {
    const keys = questions.map((_, index) => questionKey(index));

    return {
      type: 'object',
      properties: Object.fromEntries(
        questions.map((question, index) => [keys[index], this.answerSchema(question)])
      ),
      required: keys,
    };
  }

  private answerSchema(question: DecisionQuestion): ToolSchemaType {
    switch (question.type) {
      case 'predicate':
        return {
          type: 'object',
          properties: { probability: probability('Probability that the answer is yes') },
          required: ['probability'],
        };
      case 'choice':
        return this.perOption(Object.keys(question.choices));
      case 'score':
        return this.perOption(question.levels.map(({ label }) => label));
    }
  }

  /** A probability per option, so the model weighs the options instead of rating its own pick. */
  private perOption(options: string[]): ToolSchemaType {
    return {
      type: 'object',
      properties: {
        probabilities: {
          type: 'object',
          properties: Object.fromEntries(
            options.map((option) => [
              option,
              probability(`Probability that "${option}" is the right answer`),
            ])
          ),
          required: options,
        },
      },
      required: ['probabilities'],
    };
  }

  private describeQuestion(name: string, question: DecisionQuestion): string {
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
  }

  private topOption(probabilities: Record<string, number> = {}): [string, number] {
    return Object.entries(probabilities).sort(([, a], [, b]) => b - a)[0] ?? ['', 0];
  }

  private toAnswer(question: DecisionQuestion, raw: RawAnswer): DecisionAnswer {
    if (question.type === 'predicate') {
      return { type: 'predicate', probability: raw.probability ?? 0 };
    }

    const probabilities = raw.probabilities ?? {};
    const [option, confidence] = this.topOption(probabilities);

    return question.type === 'choice'
      ? { type: 'choice', choice: option, confidence, probabilities }
      : {
          type: 'score',
          score: question.levels.findIndex(({ label }) => label === option),
          confidence,
          probabilities,
        };
  }
}
