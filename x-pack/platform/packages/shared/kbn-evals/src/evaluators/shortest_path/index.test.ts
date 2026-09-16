/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createShortestPathEvaluator } from '.';

const run = async (
  evaluator: ReturnType<typeof createShortestPathEvaluator>,
  output: unknown,
  expected: unknown
) => evaluator.evaluate({ output, expected, input: {}, messages: [] } as never);

const toolCall = (toolId: string) => ({ type: 'tool_call', tool_id: toolId });

describe('createShortestPathEvaluator', () => {
  const evaluator = createShortestPathEvaluator({
    maxToolCallsExtractor: (expected) => (expected as { maxToolCalls?: number })?.maxToolCalls,
  });

  it('scores 1 when the agent stays within the declared budget', async () => {
    const result = await run(
      evaluator,
      { steps: [toolCall('a'), toolCall('b')] },
      { maxToolCalls: 5 }
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe('within-budget');
  });

  it('scores 1 exactly at the budget boundary (inclusive)', async () => {
    const result = await run(
      evaluator,
      { steps: [toolCall('a'), toolCall('b'), toolCall('c')] },
      { maxToolCalls: 3 }
    );
    expect(result.score).toBe(1);
  });

  it('applies a step penalty per call over budget', async () => {
    const result = await run(
      evaluator,
      { steps: [toolCall('a'), toolCall('b'), toolCall('c'), toolCall('d')] },
      { maxToolCalls: 2 }
    );
    expect(result.score).toBeCloseTo(0.6, 10);
    expect(result.label).toBe('over-budget');
  });

  it('floors the score at 0 rather than going negative', async () => {
    const steps = Array.from({ length: 20 }, (_, i) => toolCall(`t${i}`));
    const result = await run(evaluator, { steps }, { maxToolCalls: 1 });
    expect(result.score).toBe(0);
  });

  it('honours a custom stepPenalty', async () => {
    const strict = createShortestPathEvaluator({
      maxToolCallsExtractor: () => 1,
      stepPenalty: 0.5,
    });
    const result = await run(strict, { steps: [toolCall('a'), toolCall('b')] }, {});
    expect(result.score).toBe(0.5);
  });

  it('reports skipped when the example declares no budget', async () => {
    const result = await run(evaluator, { steps: [toolCall('a')] }, {});
    expect(result.score).toBe(1);
    expect(result.label).toBe('skipped');
  });

  it('treats a non-positive budget as skipped rather than a free failure', async () => {
    const result = await run(evaluator, { steps: [toolCall('a')] }, { maxToolCalls: 0 });
    expect(result.label).toBe('skipped');
  });

  it('counts only tool_call steps, ignoring other step types', async () => {
    const result = await run(
      evaluator,
      { steps: [toolCall('a'), { type: 'message' }, { type: 'thought' }] },
      { maxToolCalls: 1 }
    );
    expect(result.score).toBe(1);
  });

  it('handles output with no steps as zero tool calls', async () => {
    const result = await run(evaluator, {}, { maxToolCalls: 3 });
    expect(result.score).toBe(1);
  });

  it('names the evaluator for result tables', () => {
    expect(evaluator.name).toBe('Shortest Path');
    expect(evaluator.kind).toBe('CODE');
  });
});
