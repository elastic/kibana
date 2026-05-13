/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConversationCoherenceEvaluator } from '.';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';

jest.mock('p-retry', () => {
  return jest.fn(async (fn: () => Promise<any>, opts?: any) => {
    const retries = opts?.retries ?? 0;
    let lastError: any;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        lastError.attemptNumber = attempt;
        lastError.retriesLeft = retries + 1 - attempt;
        opts?.onFailedAttempt?.(lastError);
      }
    }
    throw lastError;
  });
});

function createMockLog(): ToolingLog {
  return {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as ToolingLog;
}

function createMockInferenceClient(
  scores: {
    topic_consistency: number;
    context_retention: number;
    contradiction_score: number;
    resolution_quality: number;
    reasoning: string;
  } | null,
  error?: Error
): BoundInferenceClient {
  const promptFn = error
    ? jest.fn().mockRejectedValue(error)
    : jest.fn().mockResolvedValue({
        toolCalls: scores ? [{ function: { name: 'score_coherence', arguments: scores } }] : [],
      });

  return { prompt: promptFn, bindTo: jest.fn() } as unknown as BoundInferenceClient;
}

describe('createConversationCoherenceEvaluator', () => {
  it('produces the correct weighted score from a successful tool call', async () => {
    const scores = {
      topic_consistency: 0.9,
      context_retention: 0.8,
      contradiction_score: 1.0,
      resolution_quality: 0.7,
      reasoning: 'Good conversation flow.',
    };
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient: createMockInferenceClient(scores),
      log: createMockLog(),
    });

    const result = await evaluator.evaluate({
      input: {},
      output: 'User: Hi\nAssistant: Hello!',
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeCloseTo((0.9 + 0.8 + 1.0 + 0.7) / 4);
    expect(result.label).toBe('coherent');
    expect(result.reasoning).toBe('Good conversation flow.');
    expect(result.metadata).toEqual({
      topic_consistency: 0.9,
      context_retention: 0.8,
      contradiction_score: 1.0,
      resolution_quality: 0.7,
    });
  });

  it('labels partial coherence for mid-range scores', async () => {
    const scores = {
      topic_consistency: 0.6,
      context_retention: 0.5,
      contradiction_score: 0.6,
      resolution_quality: 0.5,
      reasoning: 'Some issues.',
    };
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient: createMockInferenceClient(scores),
      log: createMockLog(),
    });

    const result = await evaluator.evaluate({
      input: {},
      output: 'conversation',
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeCloseTo(0.55);
    expect(result.label).toBe('partial');
  });

  it('labels incoherent for low scores', async () => {
    const scores = {
      topic_consistency: 0.1,
      context_retention: 0.2,
      contradiction_score: 0.1,
      resolution_quality: 0.0,
      reasoning: 'Very poor.',
    };
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient: createMockInferenceClient(scores),
      log: createMockLog(),
    });

    const result = await evaluator.evaluate({
      input: {},
      output: 'conversation',
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeCloseTo(0.1);
    expect(result.label).toBe('incoherent');
  });

  it('rejects non-finite scores from the LLM', async () => {
    const badScores = {
      topic_consistency: NaN,
      context_retention: 0.8,
      contradiction_score: 1.0,
      resolution_quality: 0.7,
      reasoning: 'Bad data.',
    };
    const log = createMockLog();
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient: createMockInferenceClient(badScores),
      log,
    });

    await expect(
      evaluator.evaluate({
        input: {},
        output: 'conversation',
        expected: undefined,
        metadata: null,
      })
    ).rejects.toThrow(/invalid topic_consistency/);
  });

  it('rejects out-of-range scores from the LLM', async () => {
    const outOfRange = {
      topic_consistency: 1.5,
      context_retention: 0.8,
      contradiction_score: 1.0,
      resolution_quality: 0.7,
      reasoning: 'Over range.',
    };
    const log = createMockLog();
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient: createMockInferenceClient(outOfRange),
      log,
    });

    await expect(
      evaluator.evaluate({
        input: {},
        output: 'conversation',
        expected: undefined,
        metadata: null,
      })
    ).rejects.toThrow(/out-of-range topic_consistency/);
  });

  it('rejects negative scores from the LLM', async () => {
    const negative = {
      topic_consistency: -0.1,
      context_retention: 0.8,
      contradiction_score: 1.0,
      resolution_quality: 0.7,
      reasoning: 'Negative.',
    };
    const log = createMockLog();
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient: createMockInferenceClient(negative),
      log,
    });

    await expect(
      evaluator.evaluate({
        input: {},
        output: 'conversation',
        expected: undefined,
        metadata: null,
      })
    ).rejects.toThrow(/out-of-range topic_consistency/);
  });

  it('retries on failure and logs warnings', async () => {
    let callCount = 0;
    const goodScores = {
      topic_consistency: 0.9,
      context_retention: 0.9,
      contradiction_score: 0.9,
      resolution_quality: 0.9,
      reasoning: 'All good.',
    };

    const inferenceClient = {
      prompt: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Transient LLM error'));
        }
        return Promise.resolve({
          toolCalls: [{ function: { name: 'score_coherence', arguments: goodScores } }],
        });
      }),
      bindTo: jest.fn(),
    } as unknown as BoundInferenceClient;

    const log = createMockLog();
    const evaluator = createConversationCoherenceEvaluator({ inferenceClient, log });

    const result = await evaluator.evaluate({
      input: {},
      output: 'conversation',
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeCloseTo(0.9);
    expect(log.warning).toHaveBeenCalledTimes(2);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('logs error on final retry failure', async () => {
    const inferenceClient = {
      prompt: jest.fn().mockRejectedValue(new Error('Persistent failure')),
      bindTo: jest.fn(),
    } as unknown as BoundInferenceClient;

    const log = createMockLog();
    const evaluator = createConversationCoherenceEvaluator({ inferenceClient, log });

    await expect(
      evaluator.evaluate({
        input: {},
        output: 'conversation',
        expected: undefined,
        metadata: null,
      })
    ).rejects.toThrow('Persistent failure');

    expect(log.error).toHaveBeenCalledTimes(1);
  });

  it('rejects when LLM returns no tool call', async () => {
    const log = createMockLog();
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient: createMockInferenceClient(null),
      log,
    });

    await expect(
      evaluator.evaluate({
        input: {},
        output: 'conversation',
        expected: undefined,
        metadata: null,
      })
    ).rejects.toThrow(/No tool call found/);
  });

  it('handles non-string output by serializing to JSON', async () => {
    const scores = {
      topic_consistency: 0.8,
      context_retention: 0.8,
      contradiction_score: 0.8,
      resolution_quality: 0.8,
      reasoning: 'Object output.',
    };
    const inferenceClient = createMockInferenceClient(scores);
    const evaluator = createConversationCoherenceEvaluator({
      inferenceClient,
      log: createMockLog(),
    });

    await evaluator.evaluate({
      input: {},
      output: { messages: [{ role: 'user', content: 'hi' }] },
      expected: undefined,
      metadata: null,
    });

    expect(inferenceClient.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          conversation: expect.stringContaining('"messages"'),
        }),
      })
    );
  });
});
