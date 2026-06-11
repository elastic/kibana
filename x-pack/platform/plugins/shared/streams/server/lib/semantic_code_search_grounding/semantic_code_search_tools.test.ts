/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ToolsStart } from '@kbn/agent-builder-server';
import type { ToolCall } from '@kbn/inference-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  createSemanticCodeSearchTools,
  SCS_FIND_INTRODUCING_COMMIT_TOOL_ID,
  SCS_LIST_INDICES_TOOL_ID,
  SCS_READ_FILE_TOOL_ID,
  SCS_SEARCH_COMMIT_MESSAGES_TOOL_ID,
  SCS_SEMANTIC_SEARCH_TOOL_ID,
  SCS_SYMBOL_ANALYSIS_TOOL_ID,
} from './semantic_code_search_tools';

const makeToolCall = (name: string, args: Record<string, unknown>): ToolCall => ({
  toolCallId: 'tc-1',
  function: { name, arguments: args },
});

const ALL_TOOL_NAMES = [
  'analyze_symbol',
  'code_search',
  'git_cochanges',
  'git_file_authors',
  'git_file_history',
  'git_find_introducing_commit',
  'git_search_commits',
  'git_show_commit',
  'list_code_indices',
  'read_code_file',
  'select_code_index',
];

describe('createSemanticCodeSearchTools', () => {
  let logger: jest.Mocked<Logger>;
  let execute: jest.Mock;
  let agentBuilderTools: ToolsStart;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const request = {} as KibanaRequest;
  const codeIndex = 'code-acme_checkout';
  const repository = 'acme/checkout';

  const mockRepositoryResponse = (repo: string | undefined) => {
    (esClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: repo ? [{ _source: { repository: repo } }] : [] },
    });
  };

  // Builds the tools with an explicitly linked (pre-selected) code index.
  const buildLinked = () =>
    createSemanticCodeSearchTools({ agentBuilderTools, request, esClient, codeIndex, logger });

  // Builds the tools with no pre-linked index (agent must select one).
  const buildUnlinked = () =>
    createSemanticCodeSearchTools({ agentBuilderTools, request, esClient, logger });

  beforeEach(() => {
    logger = loggerMock.create();
    execute = jest.fn();
    agentBuilderTools = { execute } as unknown as ToolsStart;
    esClient = { search: jest.fn() } as unknown as jest.Mocked<ElasticsearchClient>;
    mockRepositoryResponse(repository);
  });

  it('always exposes the discovery, code, and git-history tools', () => {
    const { tools, callbacks } = buildUnlinked();
    expect(Object.keys(tools).sort()).toEqual(ALL_TOOL_NAMES);
    expect(Object.keys(callbacks).sort()).toEqual(ALL_TOOL_NAMES);
  });

  it('mentions the pre-selected index in the prompt snippet when linked', () => {
    const { promptSnippet } = buildLinked();
    expect(promptSnippet).toContain(codeIndex);
    expect(promptSnippet).toContain('pre-selected');
  });

  it('instructs the agent to discover an index when not linked', () => {
    const { promptSnippet } = buildUnlinked();
    expect(promptSnippet).toContain('No code index is pre-linked');
    expect(promptSnippet).toContain('list_code_indices');
  });

  it('list_code_indices executes the SCS list-indices tool with no params', async () => {
    execute.mockResolvedValue({ results: [] });
    const { callbacks } = buildUnlinked();

    await callbacks.list_code_indices(makeToolCall('list_code_indices', {}));

    expect(execute).toHaveBeenCalledWith({
      toolId: SCS_LIST_INDICES_TOOL_ID,
      toolParams: {},
      request,
    });
  });

  it('code_search uses the pre-linked index without an explicit selection', async () => {
    execute.mockResolvedValue({
      results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: { hit: 1 } }],
    });
    const { callbacks } = buildLinked();

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

  it('code_search returns an error when no index is selected', async () => {
    const { callbacks } = buildUnlinked();

    const result = await callbacks.code_search(makeToolCall('code_search', { query: 'x' }));

    expect(execute).not.toHaveBeenCalled();
    const response = result.response as { error?: string };
    expect(response.error).toContain('No code index is selected');
  });

  it('select_code_index activates an index and reports git history availability', async () => {
    const { callbacks } = buildUnlinked();

    const result = await callbacks.select_code_index(
      makeToolCall('select_code_index', { index: 'code-acme_payments' })
    );

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(result.response).toEqual({
      selected_index: 'code-acme_payments',
      git_history_available: true,
      repository,
    });

    // Subsequent code_search now targets the selected index.
    execute.mockResolvedValue({ results: [] });
    await callbacks.code_search(makeToolCall('code_search', { query: 'x' }));
    expect(execute).toHaveBeenCalledWith({
      toolId: SCS_SEMANTIC_SEARCH_TOOL_ID,
      toolParams: { query: 'x', index: 'code-acme_payments' },
      request,
    });
  });

  it('select_code_index returns an error when index is missing', async () => {
    const { callbacks } = buildUnlinked();
    const result = await callbacks.select_code_index(makeToolCall('select_code_index', {}));
    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.response).toEqual({ results: [], count: 0, error: '"index" is required.' });
  });

  it('read_code_file executes the SCS read-file tool with file_paths and the active index', async () => {
    execute.mockResolvedValue({ results: [] });
    const { callbacks } = buildLinked();

    await callbacks.read_code_file(makeToolCall('read_code_file', { file_paths: 'a.go,b.go' }));

    expect(execute).toHaveBeenCalledWith({
      toolId: SCS_READ_FILE_TOOL_ID,
      toolParams: { file_paths: 'a.go,b.go', index: codeIndex },
      request,
    });
  });

  it('analyze_symbol executes the SCS symbol analysis tool with symbol_name and the active index', async () => {
    execute.mockResolvedValue({ results: [] });
    const { callbacks } = buildLinked();

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
    const { callbacks } = buildLinked();
    const result = await callbacks.analyze_symbol(makeToolCall('analyze_symbol', {}));
    expect(execute).not.toHaveBeenCalled();
    expect(result.response).toEqual({
      results: [],
      count: 0,
      error: '"symbol_name" is required.',
    });
  });

  it('read_code_file returns an error response when file_paths is missing', async () => {
    const { callbacks } = buildLinked();
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
    const { callbacks } = buildLinked();

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
    const { callbacks } = buildLinked();

    const result = await callbacks.code_search(makeToolCall('code_search', { query: 'x' }));

    expect(result.response).toEqual({
      results: [{ type: ToolResultType.other, data: { ok: true } }],
      count: 1,
      error: 'index missing',
    });
  });

  describe('git-history tools', () => {
    it('resolve the repository for the active index lazily and inject it', async () => {
      execute.mockResolvedValue({ results: [] });
      const { callbacks } = buildLinked();

      await callbacks.git_search_commits(
        makeToolCall('git_search_commits', {
          query: 'add retry on connection refused',
          file_paths: 'src/a.ts,src/b.ts',
        })
      );

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith({
        toolId: SCS_SEARCH_COMMIT_MESSAGES_TOOL_ID,
        toolParams: {
          query: 'add retry on connection refused',
          file_paths: 'src/a.ts,src/b.ts',
          repository,
        },
        request,
      });
    });

    it('memoize repository resolution across calls', async () => {
      execute.mockResolvedValue({ results: [] });
      const { callbacks } = buildLinked();

      await callbacks.git_find_introducing_commit(
        makeToolCall('git_find_introducing_commit', { symbol_pattern: 'connection refused' })
      );
      await callbacks.git_find_introducing_commit(
        makeToolCall('git_find_introducing_commit', { symbol_pattern: 'timeout' })
      );

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenLastCalledWith({
        toolId: SCS_FIND_INTRODUCING_COMMIT_TOOL_ID,
        toolParams: { symbol_pattern: 'timeout', repository },
        request,
      });
    });

    it('return an error when no index is selected', async () => {
      const { callbacks } = buildUnlinked();
      const result = await callbacks.git_search_commits(
        makeToolCall('git_search_commits', { query: 'x' })
      );
      expect(esClient.search).not.toHaveBeenCalled();
      const response = result.response as { error?: string };
      expect(response.error).toContain('No code index is selected');
    });

    it('return an error when the active index has no git history', async () => {
      mockRepositoryResponse(undefined);
      const { callbacks } = buildLinked();

      const result = await callbacks.git_search_commits(
        makeToolCall('git_search_commits', { query: 'x' })
      );

      expect(execute).not.toHaveBeenCalled();
      const response = result.response as { error?: string };
      expect(response.error).toContain('No git history is available');
    });

    it('return an error when a required argument is missing', async () => {
      const { callbacks } = buildLinked();
      const result = await callbacks.git_search_commits(makeToolCall('git_search_commits', {}));
      expect(esClient.search).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
      expect(result.response).toEqual({ results: [], count: 0, error: '"query" is required.' });
    });
  });
});
