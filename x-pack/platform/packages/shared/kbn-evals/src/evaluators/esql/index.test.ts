/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeUntilValid: jest.fn(),
}));

jest.mock('p-retry', () => ({
  __esModule: true,
  default: async <T>(fn: () => Promise<T>) => fn(),
}));

import { executeUntilValid } from '@kbn/inference-prompt-utils';
import { createEsqlEquivalenceEvaluator } from '.';

const executeUntilValidMock = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;

const log = { error: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const createEvaluator = () =>
  createEsqlEquivalenceEvaluator({
    inferenceClient: {} as BoundInferenceClient,
    log,
    predictionExtractor: (output) => (output as { query?: string })?.query ?? '',
    groundTruthExtractor: (expected) => (expected as { query?: string })?.query ?? '',
  });

const evaluate = (output: unknown, expected: unknown) =>
  createEvaluator().evaluate({ input: {}, output, expected, metadata: null });

describe('createEsqlEquivalenceEvaluator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a null error score when the ground truth query is missing', async () => {
    const result = await evaluate({ query: 'FROM a' }, {});

    expect(result).toMatchObject({ score: null, label: 'error' });
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  it('scores 0 when the task produced no prediction', async () => {
    const result = await evaluate({}, { query: 'FROM a' });

    expect(result).toMatchObject({ score: 0, label: 'No' });
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  it('returns a null error score when the equivalence analysis fails', async () => {
    executeUntilValidMock.mockRejectedValue(new Error('judge unavailable'));

    const result = await evaluate({ query: 'FROM a' }, { query: 'FROM b' });

    expect(result.score).toBeNull();
    expect(result.label).toBe('error');
    expect(result.explanation).toContain('judge unavailable');
  });

  it('scores 1 for an equivalent query', async () => {
    executeUntilValidMock.mockResolvedValue({
      toolCalls: [{ function: { arguments: { equivalent: 'Yes', reason: 'same' } } }],
    } as unknown as Awaited<ReturnType<typeof executeUntilValid>>);

    const result = await evaluate({ query: 'FROM a' }, { query: 'FROM a' });

    expect(result).toMatchObject({ score: 1, label: 'Equivalent ES|QL query' });
  });
});
