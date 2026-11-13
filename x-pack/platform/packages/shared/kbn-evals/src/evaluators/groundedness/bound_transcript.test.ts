/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boundToolCallHistory, DEFAULT_TRANSCRIPT_BYTE_BUDGET } from './bound_transcript';

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

const toolStep = (toolId: string, result: string) => ({
  type: 'tool_call',
  tool_id: toolId,
  params: { index: 'logs-*' },
  results: [{ type: 'text', data: { content: result } }],
});

describe('boundToolCallHistory', () => {
  it('returns a transcript that already fits byte-identical and untouched', () => {
    const steps = [
      toolStep('security.get_entity', 'small result'),
      toolStep('security.search', 'ok'),
    ];

    const { json, report } = boundToolCallHistory(steps);

    expect(json).toBe(JSON.stringify(steps));
    expect(report.bounded).toBe(false);
    expect(report.shortenedValues).toBe(0);
    expect(report.droppedSteps).toBe(0);
  });

  it('shortens an oversized tool result while keeping its head and the step metadata', () => {
    // A search over the conversation store has been measured at megabytes in one result.
    const huge = 'A'.repeat(3_000_000);
    const steps = [toolStep('security.search', huge), toolStep('security.get_entity', 'small')];

    const { json, report } = boundToolCallHistory(steps);

    expect(report.bounded).toBe(true);
    expect(report.shortenedValues).toBeGreaterThan(0);
    expect(report.originalBytes).toBeGreaterThan(3_000_000);
    expect(report.boundedBytes).toBeLessThanOrEqual(DEFAULT_TRANSCRIPT_BYTE_BUDGET);
    expect(byteLength(json)).toBeLessThanOrEqual(DEFAULT_TRANSCRIPT_BYTE_BUDGET);

    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].tool_id).toBe('security.search');
    expect(parsed[0].type).toBe('tool_call');
    expect(parsed[0].params).toEqual({ index: 'logs-*' });
    // The head of the result survives so the judge can still cite evidence from it.
    expect(parsed[0].results[0].data.content.startsWith('AAAA')).toBe(true);
    expect(parsed[0].results[0].data.content).toMatch(/\.\.\.\[\+\d+ chars\]$/);
    // Untouched steps stay intact.
    expect(parsed[1].results[0].data.content).toBe('small');
  });

  it('produces valid JSON at or under a custom budget', () => {
    const steps = Array.from({ length: 40 }, (_, i) => toolStep(`tool.${i}`, 'B'.repeat(50_000)));

    const { json, report } = boundToolCallHistory(steps, { budgetBytes: 20_000 });

    expect(() => JSON.parse(json)).not.toThrow();
    expect(report.boundedBytes).toBeLessThanOrEqual(20_000);
    expect(report.bounded).toBe(true);
  });

  it('drops the oldest steps when shortened steps still do not fit, and records it', () => {
    const steps = Array.from({ length: 2_000 }, (_, i) =>
      toolStep(`tool.${i}`, `result-${i}`.padEnd(500, 'x'))
    );

    const { json, report } = boundToolCallHistory(steps, { budgetBytes: 30_000 });

    expect(report.droppedSteps).toBeGreaterThan(0);
    const parsed = JSON.parse(json);
    expect(parsed[0].type).toBe('transcript_bounded');
    expect(parsed[0].dropped_steps).toBe(report.droppedSteps);
    // The most recent steps are the ones retained.
    expect(parsed[parsed.length - 1].tool_id).toBe('tool.1999');
    expect(byteLength(json)).toBeLessThanOrEqual(30_000);
  });

  it('never splits a multi-byte character at the cut', () => {
    const steps = [toolStep('security.search', '😀'.repeat(200_000))];

    const { json } = boundToolCallHistory(steps, { budgetBytes: 50_000 });

    const parsed = JSON.parse(json);
    const content = parsed[0].results[0].data.content;
    // A lone surrogate would make the string unrepresentable in JSON.
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(content)).toBe(false);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('is a no-op when the bound is disabled', () => {
    const huge = 'C'.repeat(2_000_000);
    const steps = [toolStep('security.search', huge)];

    const { json, report } = boundToolCallHistory(steps, { budgetBytes: 0 });

    expect(json).toBe(JSON.stringify(steps));
    expect(report.bounded).toBe(false);
  });

  it('degrades to an empty transcript rather than throwing on an unserializable input', () => {
    const circular: Record<string, unknown> = { type: 'tool_call' };
    circular.self = circular;

    const { json, report } = boundToolCallHistory([circular]);

    expect(json).toBe('[]');
    expect(report.unserializable).toBe(true);
  });

  it('treats a non-array history as empty', () => {
    const { json, report } = boundToolCallHistory(undefined);

    expect(json).toBe('[]');
    expect(report.bounded).toBe(false);
  });
});
