/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common';
import { enforceResultSizeLimit, MAX_TOOL_RESULT_BYTES } from './enforce_result_size_limit';

const otherResult = (data: unknown): ToolResult => ({
  tool_result_id: 'result-1',
  type: ToolResultType.other,
  data: data as Record<string, unknown>,
});

describe('enforceResultSizeLimit', () => {
  it('returns the results unchanged when within the byte limit', () => {
    const results = [otherResult({ hello: 'world' })];
    expect(enforceResultSizeLimit(results)).toBe(results);
  });

  it('caps a single oversized result into one `other` result with a truncation notice', () => {
    // A single string field larger than the limit guarantees the serialized set exceeds it.
    const results = [otherResult({ text: 'x'.repeat(MAX_TOOL_RESULT_BYTES + 100) })];

    const capped = enforceResultSizeLimit(results);

    expect(capped).toHaveLength(1);
    expect(capped[0].type).toBe(ToolResultType.other);
    const content = (capped[0].data as { content: string }).content;
    expect(content).toContain('Tool result truncated');
    expect(content).toContain('storage limit');
    // Soft ceiling: content is around the limit (notice + wrapper add a little on top).
    expect(Buffer.byteLength(content, 'utf8')).toBeLessThan(MAX_TOOL_RESULT_BYTES + 1024);
  });

  it('counts multiple results as a whole and caps them together', () => {
    // Two results each ~60% of the limit: individually under, combined over.
    const half = 'y'.repeat(Math.ceil(MAX_TOOL_RESULT_BYTES * 0.6));
    const results = [otherResult({ text: half }), otherResult({ text: half })];

    const capped = enforceResultSizeLimit(results);

    expect(capped).toHaveLength(1);
    expect(capped[0].type).toBe(ToolResultType.other);
  });

  it('leaves a result set that is just under the limit unchanged', () => {
    // Keep well clear of the limit accounting for JSON envelope overhead.
    const results = [otherResult({ text: 'z'.repeat(MAX_TOOL_RESULT_BYTES - 1024) })];
    expect(enforceResultSizeLimit(results)).toBe(results);
  });
});
