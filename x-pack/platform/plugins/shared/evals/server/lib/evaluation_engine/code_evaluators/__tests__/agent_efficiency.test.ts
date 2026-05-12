/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentEfficiencyEvaluator } from '../agent_efficiency';

const makeToolCalls = (
  names: string[],
  opts?: { errors?: number[]; results?: Record<number, string> }
) =>
  names.map((toolName, i) => ({
    toolName,
    args: {},
    ...(opts?.errors?.includes(i) ? { error: 'something failed' } : {}),
    ...(opts?.results?.[i] ? { result: opts.results[i] } : {}),
  }));

const evaluate = (input: Record<string, unknown>, output: unknown) =>
  agentEfficiencyEvaluator.evaluate({
    input,
    output,
  });

describe('agent-efficiency evaluator', () => {
  it('has correct name and kind', () => {
    expect(agentEfficiencyEvaluator.name).toBe('agent-efficiency');
    expect(agentEfficiencyEvaluator.kind).toBe('CODE');
    expect(agentEfficiencyEvaluator.source).toBe('prebuilt');
  });

  describe('tool loop detection', () => {
    it('scores 1.0 when no tool calls', async () => {
      const result = await evaluate({ query: 'test' }, { content: 'response' });
      // No loops, no retries, bloat depends on lengths
      expect(result.metadata?.loopScore).toBe(1.0);
    });

    it('scores 1.0 when all tool names are different', async () => {
      const result = await evaluate(
        { query: 'test' },
        { toolCalls: makeToolCalls(['search', 'filter', 'sort']) }
      );
      expect(result.metadata?.loopScore).toBe(1.0);
    });

    it('scores 0.5 when 2 consecutive same tools', async () => {
      const result = await evaluate(
        { query: 'test' },
        { toolCalls: makeToolCalls(['search', 'search', 'filter']) }
      );
      expect(result.metadata?.loopScore).toBe(0.5);
    });

    it('scores 0 when 3+ consecutive same tools', async () => {
      const result = await evaluate(
        { query: 'test' },
        { toolCalls: makeToolCalls(['search', 'search', 'search', 'filter']) }
      );
      expect(result.metadata?.loopScore).toBe(0);
    });

    it('detects longest consecutive run across sequence', async () => {
      const result = await evaluate(
        { query: 'test' },
        { toolCalls: makeToolCalls(['a', 'b', 'b', 'b', 'c']) }
      );
      expect(result.metadata?.loopScore).toBe(0);
    });
  });

  describe('retry detection', () => {
    it('scores 1.0 when no retries', async () => {
      const result = await evaluate(
        { query: 'test' },
        { toolCalls: makeToolCalls(['search', 'filter']) }
      );
      expect(result.metadata?.retryScore).toBe(1.0);
    });

    it('reduces score when same tool retried after error', async () => {
      const result = await evaluate(
        { query: 'test' },
        { toolCalls: makeToolCalls(['search', 'search'], { errors: [0] }) }
      );
      expect(result.metadata?.retryScore).toBeLessThan(1.0);
    });

    it('detects error from result string containing "error"', async () => {
      const result = await evaluate(
        { query: 'test' },
        {
          toolCalls: makeToolCalls(['search', 'search'], {
            results: { 0: 'Request failed with error: timeout' },
          }),
        }
      );
      expect(result.metadata?.retryScore).toBeLessThan(1.0);
    });

    it('does not flag different tools as retries', async () => {
      const result = await evaluate(
        { query: 'test' },
        { toolCalls: makeToolCalls(['search', 'filter'], { errors: [0] }) }
      );
      expect(result.metadata?.retryScore).toBe(1.0);
    });
  });

  describe('bloat detection', () => {
    it('scores 1.0 for short output relative to input', async () => {
      const result = await evaluate(
        { query: 'What is Kibana?' },
        { content: 'Kibana is a data visualization tool.' }
      );
      expect(result.metadata?.bloatScore).toBe(1.0);
    });

    it('scores 0.5 for medium bloat (20-50x)', async () => {
      const query = 'short';
      const content = 'x'.repeat(query.length * 30); // 30x
      const result = await evaluate({ query }, { content });
      expect(result.metadata?.bloatScore).toBe(0.5);
    });

    it('scores 0 for high bloat (>50x)', async () => {
      const query = 'hi';
      const content = 'x'.repeat(query.length * 60); // 60x
      const result = await evaluate({ query }, { content });
      expect(result.metadata?.bloatScore).toBe(0.0);
    });

    it('measures JSON.stringify length when output is object without content', async () => {
      const query = 'test';
      const output = { data: 'x'.repeat(query.length * 60) };
      const result = await evaluate({ query }, output);
      expect(result.metadata?.bloatScore).toBe(0.0);
    });
  });

  describe('weighted scoring and labels', () => {
    it('returns pass when all components score well', async () => {
      const result = await evaluate(
        { query: 'What is Kibana?' },
        {
          toolCalls: makeToolCalls(['search', 'filter']),
          content: 'Short answer.',
        }
      );
      expect(result.score).toBeGreaterThanOrEqual(0.7);
      expect(result.label).toBe('pass');
    });

    it('returns fail when tool loops and high bloat', async () => {
      const query = 'hi';
      const result = await evaluate(
        { query },
        {
          toolCalls: makeToolCalls(['a', 'a', 'a', 'a']),
          content: 'x'.repeat(200),
        }
      );
      expect(result.score).toBeLessThan(0.4);
      expect(result.label).toBe('fail');
    });

    it('includes metadata with all sub-scores and tool count', async () => {
      const result = await evaluate({ query: 'test' }, { toolCalls: makeToolCalls(['a', 'b']) });
      expect(result.metadata).toMatchObject({
        loopScore: expect.any(Number),
        retryScore: expect.any(Number),
        bloatScore: expect.any(Number),
        toolCallCount: 2,
      });
    });
  });

  describe('edge cases', () => {
    it('handles null output gracefully', async () => {
      const result = await evaluate({ query: 'test' }, null);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.evaluator).toBe('agent-efficiency');
    });

    it('handles undefined output gracefully', async () => {
      const result = await evaluate({ query: 'test' }, undefined);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('handles string output', async () => {
      const result = await evaluate({ query: 'test' }, 'a simple string response');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.toolCallCount).toBe(0);
    });

    it('extracts toolCalls from metadata.toolCalls', async () => {
      const result = await evaluate(
        { query: 'test' },
        { metadata: { toolCalls: makeToolCalls(['a', 'b', 'c']) } }
      );
      expect(result.metadata?.toolCallCount).toBe(3);
    });

    it('handles single tool call', async () => {
      const result = await evaluate({ query: 'test' }, { toolCalls: makeToolCalls(['search']) });
      expect(result.metadata?.loopScore).toBe(1.0);
      expect(result.metadata?.retryScore).toBe(1.0);
    });
  });
});
