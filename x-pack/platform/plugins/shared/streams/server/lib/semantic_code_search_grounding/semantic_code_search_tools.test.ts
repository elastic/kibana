/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ToolsStart } from '@kbn/agent-builder-server';
import type { ToolCall } from '@kbn/inference-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  createSemanticCodeSearchTools,
  SCS_READ_FILE_TOOL_ID,
  SCS_SEMANTIC_SEARCH_TOOL_ID,
  SCS_SYMBOL_ANALYSIS_TOOL_ID,
} from './semantic_code_search_tools';

const makeToolCall = (name: string, args: Record<string, unknown>): ToolCall => ({
  toolCallId: 'tc-1',
  function: { name, arguments: args },
});

describe('createSemanticCodeSearchTools', () => {
  let logger: jest.Mocked<Logger>;
  let execute: jest.Mock;
  let agentBuilderTools: ToolsStart;
  const request = {} as KibanaRequest;
  const codeIndex = 'code-acme_checkout';

  const build = () =>
    createSemanticCodeSearchTools({ agentBuilderTools, request, codeIndex, logger });

  beforeEach(() => {
    logger = loggerMock.create();
    execute = jest.fn();
    agentBuilderTools = { execute } as unknown as ToolsStart;
  });

  it('exposes the code search tools and a prompt snippet mentioning the index', () => {
    const { tools, callbacks, promptSnippet } = build();
    expect(Object.keys(tools).sort()).toEqual(['analyze_symbol', 'code_search', 'read_code_file']);
    expect(Object.keys(callbacks).sort()).toEqual([
      'analyze_symbol',
      'code_search',
      'read_code_file',
    ]);
    expect(promptSnippet).toContain(codeIndex);
  });

  it('code_search executes the SCS semantic search tool with the linked index injected', async () => {
    execute.mockResolvedValue({
      results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: { hit: 1 } }],
    });
    const { callbacks } = build();

    const result = await callbacks.code_search(
      makeToolCall('code_search', { query: 'connection refused', size: 10 })
    );

    expect(execute).toHaveBeenCalledWith({
      toolId: SCS_SEMANTIC_SEARCH_TOOL_ID,
      toolParams: { query: 'connection refused', size: 10, index: codeIndex },
      request,
    });
    expect(result.response).toEqual({
      results: [{ type: ToolResultType.other, data: { hit: 1 } }],
      count: 1,
    });
  });

  it('read_code_file executes the SCS read-file tool with file_paths and index', async () => {
    execute.mockResolvedValue({ results: [] });
    const { callbacks } = build();

    await callbacks.read_code_file(makeToolCall('read_code_file', { file_paths: 'a.go,b.go' }));

    expect(execute).toHaveBeenCalledWith({
      toolId: SCS_READ_FILE_TOOL_ID,
      toolParams: { file_paths: 'a.go,b.go', index: codeIndex },
      request,
    });
  });

  it('analyze_symbol executes the SCS symbol analysis tool with symbol_name and index', async () => {
    execute.mockResolvedValue({ results: [] });
    const { callbacks } = build();

    await callbacks.analyze_symbol(
      makeToolCall('analyze_symbol', { symbol_name: 'ConnectionRefusedError' })
    );

    expect(execute).toHaveBeenCalledWith({
      toolId: SCS_SYMBOL_ANALYSIS_TOOL_ID,
      toolParams: { symbol_name: 'ConnectionRefusedError', index: codeIndex },
      request,
    });
  });

  it('analyze_symbol returns an error response when symbol_name is missing', async () => {
    const { callbacks } = build();
    const result = await callbacks.analyze_symbol(makeToolCall('analyze_symbol', {}));
    expect(execute).not.toHaveBeenCalled();
    expect(result.response).toEqual({
      results: [],
      count: 0,
      error: '"symbol_name" is required.',
    });
  });

  it('read_code_file returns an error response when file_paths is missing', async () => {
    const { callbacks } = build();
    const result = await callbacks.read_code_file(makeToolCall('read_code_file', {}));
    expect(execute).not.toHaveBeenCalled();
    expect(result.response).toEqual({
      results: [],
      count: 0,
      error: '"file_paths" is required.',
    });
  });

  it('surfaces tool execution errors as a response instead of throwing', async () => {
    execute.mockRejectedValue(new Error('workflow not found'));
    const { callbacks } = build();

    const result = await callbacks.code_search(makeToolCall('code_search', { query: 'x' }));

    expect(result.response).toEqual({ results: [], count: 0, error: 'workflow not found' });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('maps error-type tool results into the error field', async () => {
    execute.mockResolvedValue({
      results: [
        { tool_result_id: 'e1', type: ToolResultType.error, data: { message: 'index missing' } },
        { tool_result_id: 'r1', type: ToolResultType.other, data: { ok: true } },
      ],
    });
    const { callbacks } = build();

    const result = await callbacks.code_search(makeToolCall('code_search', { query: 'x' }));

    expect(result.response).toEqual({
      results: [{ type: ToolResultType.other, data: { ok: true } }],
      count: 1,
      error: 'index missing',
    });
  });
});
