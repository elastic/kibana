/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { EffortLevels } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { DecisionQuestion } from '@kbn/inference-common';
import { FastModelDecisionProvider } from './fast_model';
import { DecisionProviderUnavailableError, isDecisionProviderUnavailableError } from './types';

const shouldRespond: DecisionQuestion = {
  type: 'predicate',
  instructions: 'Should the agent respond?',
};
const pick: DecisionQuestion = {
  type: 'choice',
  instructions: 'Pick one',
  choices: { a: 'first', b: 'second' },
};
const severity: DecisionQuestion = {
  type: 'score',
  instructions: 'How severe?',
  levels: [
    { label: 'low', description: 'minor' },
    { label: 'high', description: 'major' },
  ],
};
const questions = [shouldRespond, pick, severity];

const setup = ({
  output,
  selectError,
}: {
  output?: Record<string, unknown>;
  selectError?: Error;
} = {}) => {
  const outputApi = jest.fn().mockResolvedValue({ id: 'decide', content: '', output });
  const selectModel = selectError
    ? jest.fn().mockRejectedValue(selectError)
    : jest.fn().mockResolvedValue({
        inferenceClient: { output: outputApi },
        connector: { connectorId: 'fast-connector' },
      });
  const createModelProvider = jest
    .fn()
    .mockReturnValue({ selectModel } as unknown as ModelProvider);
  const run = (asked: DecisionQuestion[] = questions) =>
    new FastModelDecisionProvider({
      createModelProvider,
      timeoutMs: 1000,
      unavailableTtlMs: 1000,
    }).decide({
      request: httpServerMock.createKibanaRequest(),
      input: '@agent can you help?',
      questions: asked,
    });

  return { run, outputApi, selectModel };
};

describe('FastModelDecisionProvider', () => {
  it('asks the fast model with structured output', async () => {
    const { run, selectModel, outputApi } = setup({
      output: { question_1: { probability: 0.8 } },
    });

    await run([shouldRespond]);

    expect(selectModel).toHaveBeenCalledWith({ effortLevel: EffortLevels.low });
    expect(outputApi).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'decide',
        input: '@agent can you help?',
        abortSignal: expect.any(AbortSignal),
        retry: { onValidationError: false },
      })
    );
  });

  it('asks for calibrated probabilities', async () => {
    const { run, outputApi } = setup({ output: { question_1: { probability: 0.8 } } });

    await run([shouldRespond]);

    const [{ system }] = outputApi.mock.calls[0];

    expect(system).toContain('Use the whole range');
    expect(system).toContain('- question_1 (yes or no): Should the agent respond?');
  });

  it('asks for a probability per option on choice and score questions', async () => {
    const { run, outputApi } = setup({
      output: {
        question_1: { probabilities: { a: 0.3, b: 0.7 } },
        question_2: { probabilities: { low: 0.4, high: 0.6 } },
      },
    });

    await run([pick, severity]);

    const [{ schema }] = outputApi.mock.calls[0];

    expect(schema.required).toEqual(['question_1', 'question_2']);
    expect(schema.properties.question_1).toEqual({
      type: 'object',
      properties: {
        probabilities: {
          type: 'object',
          properties: {
            a: expect.objectContaining({ type: 'number' }),
            b: expect.objectContaining({ type: 'number' }),
          },
          required: ['a', 'b'],
        },
      },
      required: ['probabilities'],
    });
    expect(schema.properties.question_2.properties.probabilities.required).toEqual(['low', 'high']);
  });

  it('answers with the most likely option and its probability as the confidence', async () => {
    const { run } = setup({
      output: {
        question_1: { probability: 0.8 },
        question_2: { probabilities: { a: 0.3, b: 0.7 } },
        question_3: { probabilities: { low: 0.4, high: 0.6 } },
      },
    });

    await expect(run()).resolves.toEqual({
      inferenceId: 'fast_model:fast-connector',
      answers: [
        { type: 'predicate', probability: 0.8 },
        { type: 'choice', choice: 'b', confidence: 0.7, probabilities: { a: 0.3, b: 0.7 } },
        { type: 'score', score: 1, confidence: 0.6, probabilities: { low: 0.4, high: 0.6 } },
      ],
    });
  });

  it('is unavailable when no model is configured', async () => {
    const { run } = setup({ selectError: new Error('No connector available') });

    await expect(run()).rejects.toBeInstanceOf(DecisionProviderUnavailableError);
  });

  it('fails with a retryable error when selecting the model fails otherwise', async () => {
    const { run } = setup({ selectError: new Error('ES unavailable') });

    const error = await run().catch((thrown) => thrown);

    expect(error).toBeInstanceOf(Error);
    expect(isDecisionProviderUnavailableError(error)).toBe(false);
  });

  it('rejects output missing an answer', async () => {
    const { run } = setup({ output: { question_1: { probability: 0.8 } } });

    await expect(run()).rejects.toThrow(/question_2/);
  });
});
