/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { EffortLevels } from '@kbn/agent-builder-common';
import type { DecisionQuestion, ModelProvider } from '@kbn/agent-builder-server';
import { createFastModelDecisionProvider } from './fast_model';
import { DecisionProviderUnavailableError, isDecisionProviderUnavailableError } from './types';

const questions: Record<string, DecisionQuestion> = {
  should_respond: { type: 'predicate', instructions: 'Should the agent respond?' },
  pick: { type: 'choice', instructions: 'Pick one', choices: { a: 'first', b: 'second' } },
  severity: {
    type: 'score',
    instructions: 'How severe?',
    levels: [
      { label: 'low', description: 'minor' },
      { label: 'high', description: 'major' },
    ],
  },
};

const setup = ({
  output,
  selectError,
}: {
  output?: Record<string, unknown>;
  selectError?: Error;
} = {}) => {
  const invoke = jest.fn().mockResolvedValue(output);
  const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
  const selectModel = selectError
    ? jest.fn().mockRejectedValue(selectError)
    : jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput },
        connector: { connectorId: 'fast-connector' },
      });
  const createModelProvider = jest
    .fn()
    .mockReturnValue({ selectModel } as unknown as ModelProvider);
  const { signal } = new AbortController();

  const run = (asked: Record<string, DecisionQuestion> = questions) =>
    createFastModelDecisionProvider({ createModelProvider }).decide({
      request: httpServerMock.createKibanaRequest(),
      input: '@agent can you help?',
      questions: asked,
      signal,
    });

  return { run, invoke, withStructuredOutput, selectModel, signal };
};

describe('createFastModelDecisionProvider', () => {
  it('asks the fast model with structured output', async () => {
    const { run, selectModel, withStructuredOutput, invoke, signal } = setup({
      output: { should_respond: { probability: 0.8 } },
    });

    await run({ should_respond: questions.should_respond });

    expect(selectModel).toHaveBeenCalledWith({ effortLevel: EffortLevels.low });
    expect(withStructuredOutput).toHaveBeenCalledWith(expect.anything(), { name: 'decide' });
    expect(invoke).toHaveBeenCalledWith(expect.any(Array), { signal });
    expect(JSON.stringify(invoke.mock.calls[0][0])).toContain('@agent can you help?');
  });

  it('converts the structured output to decision answers', async () => {
    const { run } = setup({
      output: {
        should_respond: { probability: 0.8 },
        pick: { choice: 'b', confidence: 0.6 },
        severity: { level: 'high', confidence: 0.7 },
      },
    });

    await expect(run()).resolves.toEqual({
      inferenceId: 'fast_model:fast-connector',
      answers: {
        should_respond: { type: 'predicate', probability: 0.8 },
        pick: { type: 'choice', choice: 'b', confidence: 0.6, probabilities: { b: 0.6 } },
        severity: { type: 'score', score: 1, confidence: 0.7, probabilities: { high: 0.7 } },
      },
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
    const { run } = setup({ output: { should_respond: { probability: 0.8 } } });

    await expect(run()).rejects.toThrow(/pick/);
  });
});
