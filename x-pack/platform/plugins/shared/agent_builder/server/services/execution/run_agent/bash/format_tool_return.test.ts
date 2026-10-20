/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ToolResult } from '@kbn/agent-builder-common/tools';
import type { RunToolReturn } from '@kbn/agent-builder-server/runner';
import { formatToolReturn } from './format_tool_return';

const other = (data: Record<string, unknown>, id = 'r1'): ToolResult => ({
  tool_result_id: id,
  type: ToolResultType.other,
  data,
});

const errorResult = (message: string, id = 'e1'): ToolResult => ({
  tool_result_id: id,
  type: ToolResultType.error,
  data: { message },
});

describe('formatToolReturn', () => {
  it('unwraps a single result to its data', () => {
    const ret: RunToolReturn = { results: [other({ hello: 'world' })] };
    expect(formatToolReturn(ret)).toEqual({ ok: true, value: { hello: 'world' } });
  });

  it('maps multiple results to an array of their data', () => {
    const ret: RunToolReturn = { results: [other({ a: 1 }, 'r1'), other({ b: 2 }, 'r2')] };
    expect(formatToolReturn(ret)).toEqual({ ok: true, value: [{ a: 1 }, { b: 2 }] });
  });

  it('returns an empty array when there are no results', () => {
    expect(formatToolReturn({ results: [] })).toEqual({ ok: true, value: [] });
    expect(formatToolReturn({})).toEqual({ ok: true, value: [] });
  });

  it('fails when the single result is an error', () => {
    const ret: RunToolReturn = { results: [errorResult('boom')] };
    expect(formatToolReturn(ret)).toEqual({ ok: false, error: 'boom' });
  });

  it('fails and joins messages when any result is an error', () => {
    const ret: RunToolReturn = {
      results: [other({ a: 1 }), errorResult('first', 'e1'), errorResult('second', 'e2')],
    };
    expect(formatToolReturn(ret)).toEqual({ ok: false, error: 'first; second' });
  });

  it('fails when the return is a prompt interruption', () => {
    const ret = { prompt: { some: 'prompt' } } as unknown as RunToolReturn;
    expect(formatToolReturn(ret)).toEqual({
      ok: false,
      error: 'tool requires user interaction and cannot be run via bash',
    });
  });
});
