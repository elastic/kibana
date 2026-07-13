/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import {
  getResultFileName,
  getToolCallDirPath,
  getToolCallEntryAbsolutePath,
} from '../../runner/store/volumes/tool_results/utils';
import { buildGuardedToolContent } from './tool_result_guardrail';

const otherResult = (data: unknown): ToolResult => ({
  tool_result_id: 'result-1',
  type: ToolResultType.other,
  data: data as Record<string, unknown>,
});

describe('buildGuardedToolContent', () => {
  it('returns the stringified results unchanged when under budget', () => {
    const results = [otherResult({ hello: 'world' })];
    const content = buildGuardedToolContent({
      results,
      toolId: 'my_tool',
      toolCallId: 'call-1',
      maxTokens: 20_000,
    });

    expect(content).toEqual(JSON.stringify({ results }));
  });

  it('merges a single oversized result into one `other` result linking directly to the result file', () => {
    const huge = 'x'.repeat(500 * 4); // ~500 tokens
    const results = [otherResult({ text: huge })];

    const content = buildGuardedToolContent({
      results,
      toolId: 'my_tool',
      toolCallId: 'call-1',
      maxTokens: 100,
    });

    const parsed = JSON.parse(content) as { results: ToolResult[] };
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].type).toBe(ToolResultType.other);

    const message = (parsed.results[0].data as { content: string }).content;
    const expectedFilePath = getToolCallEntryAbsolutePath(
      `${getToolCallDirPath({ toolId: 'my_tool', toolCallId: 'call-1' })}/${getResultFileName(
        0,
        1
      )}`
    );
    expect(message).toContain('Output too large');
    expect(message).toContain('tokens');
    // The single-result case links directly to the result file, not the directory.
    expect(message).toContain(expectedFilePath);
    expect(message).toContain('`read_file`');
    expect(message).not.toContain('`list_files`');
    expect(message).toContain('Preview (first 100 tokens):');
  });

  it('counts multiple results as a whole, merges them, and points at the directory (no single file to link to)', () => {
    const results = [
      otherResult({ text: 'a'.repeat(200) }),
      otherResult({ text: 'b'.repeat(200) }),
    ];
    // Individually each result is small, but combined they exceed a tiny budget.
    const content = buildGuardedToolContent({
      results,
      toolId: 'my_tool',
      toolCallId: 'call-1',
      maxTokens: 50,
    });

    const parsed = JSON.parse(content) as { results: ToolResult[] };
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].type).toBe(ToolResultType.other);

    const message = (parsed.results[0].data as { content: string }).content;
    const expectedDirPath = getToolCallEntryAbsolutePath(
      getToolCallDirPath({ toolId: 'my_tool', toolCallId: 'call-1' })
    );
    expect(message).toContain(expectedDirPath);
    expect(message).toContain('`list_files`');
    expect(message).toContain('`read_file`');
  });

  it('leaves multiple results untouched when their combined size is under budget', () => {
    const results = [otherResult({ text: 'a' }), otherResult({ text: 'b' })];
    const content = buildGuardedToolContent({
      results,
      toolId: 'my_tool',
      toolCallId: 'call-1',
      maxTokens: 20_000,
    });

    expect(content).toEqual(JSON.stringify({ results }));
  });

  it('never truncates when maxTokens is Infinity, regardless of size', () => {
    const huge = 'x'.repeat(100_000);
    const results = [otherResult({ text: huge })];

    const content = buildGuardedToolContent({
      results,
      toolId: 'my_tool',
      toolCallId: 'call-1',
      maxTokens: Infinity,
    });

    expect(content).toEqual(JSON.stringify({ results }));
  });

  it('omits the recovery pointer and explains why for tools excluded from the filestore', () => {
    const huge = 'x'.repeat(500 * 4);
    const results = [otherResult({ text: huge })];

    // 'read_file' is an internal tool id, and isExcludedFromFilestore(toolName) === isInternalTool(toolName).
    const content = buildGuardedToolContent({
      results,
      toolId: 'read_file',
      toolCallId: 'call-1',
      maxTokens: 100,
    });

    const parsed = JSON.parse(content) as { results: ToolResult[] };
    const message = (parsed.results[0].data as { content: string }).content;
    expect(message).toContain('not recoverable');
    expect(message).not.toContain('list_files');
    expect(message).not.toContain('read_file');
  });

  it('preview text is capped at maxTokens tokens worth of the stringified results', () => {
    const huge = 'x'.repeat(2000);
    const results = [otherResult({ text: huge })];

    const content = buildGuardedToolContent({
      results,
      toolId: 'my_tool',
      toolCallId: 'call-1',
      maxTokens: 50,
    });

    const parsed = JSON.parse(content) as { results: ToolResult[] };
    const message = (parsed.results[0].data as { content: string }).content;
    // preview is the tail-end of the message; sanity-check total token estimate isn't
    // wildly larger than the budget (some wrapper text overhead is expected and acceptable).
    expect(estimateTokens(message)).toBeLessThan(200);
  });
});
