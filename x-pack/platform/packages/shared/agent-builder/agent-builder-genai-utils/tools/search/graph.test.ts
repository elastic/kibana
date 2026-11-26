/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage } from '@langchain/core/messages';
import { loggerMock } from '@kbn/logging-mocks';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createSearchToolGraph } from './graph';
import {
  NO_MATCHING_RESOURCE_ERROR,
  naturalLanguageSearchToolName,
  relevanceSearchToolName,
} from './inner_tools';

vi.mock('../index_explorer', async () => ({
  ...(await vi.importActual('../index_explorer')),
  gatherResourceDescriptors: vi.fn(),
}));

vi.mock('../nl_search', () => ({
  naturalLanguageSearch: vi.fn(),
}));

vi.mock('../relevance_search', () => ({
  relevanceSearch: vi.fn(),
}));

import { gatherResourceDescriptors } from '../index_explorer';
import { naturalLanguageSearch } from '../nl_search';
import { relevanceSearch } from '../relevance_search';

const mockGatherResourceDescriptors = vi.mocked(gatherResourceDescriptors);
const mockNaturalLanguageSearch = vi.mocked(naturalLanguageSearch);
const mockRelevanceSearch = vi.mocked(relevanceSearch);

const createModelProvider = (index: string, toolName = naturalLanguageSearchToolName) => {
  const args =
    toolName === relevanceSearchToolName
      ? { term: 'sample records', index }
      : { query: 'sample records', index };
  const invoke = vi.fn().mockResolvedValue(
    new AIMessage({
      content: '',
      tool_calls: [{ id: 'call-1', name: toolName, args }],
    })
  );
  const chatModel = {
    bindTools: vi.fn(() => ({ withConfig: vi.fn(() => ({ invoke })) })),
  };
  return {
    getDefaultModel: vi.fn().mockResolvedValue({ chatModel }),
  } as unknown as ModelProvider;
};

const runGraph = async (modelProvider: ModelProvider) => {
  const graph = await createSearchToolGraph({
    modelProvider,
    esClient: {} as ElasticsearchClient,
    logger: loggerMock.create(),
    events: { reportProgress: vi.fn() } as unknown as ToolEventEmitter,
  });
  return graph.invoke({
    nlQuery: 'sample records',
    targetPattern: 'devteam-metrics-2026',
    allowPatternTarget: false,
    timeRange: { from: 'now-24h', to: 'now' },
  });
};

describe('createSearchToolGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGatherResourceDescriptors.mockResolvedValue([
      { type: 'index', name: 'devteam-metrics-2026' },
    ] as Awaited<ReturnType<typeof gatherResourceDescriptors>>);
    mockNaturalLanguageSearch.mockResolvedValue({
      generatedQuery: 'FROM devteam-metrics-2026 | LIMIT 10',
      esqlData: { columns: [], values: [] },
    });
  });

  it('rejects an unlisted index', async () => {
    const result = await runGraph(createModelProvider('inj-hr-private'));

    expect(result.error).toBe(NO_MATCHING_RESOURCE_ERROR);
    expect(mockNaturalLanguageSearch).not.toHaveBeenCalled();
  });

  it('rejects an unlisted index for relevance search', async () => {
    const result = await runGraph(createModelProvider('inj-hr-private', relevanceSearchToolName));

    expect(result.error).toBe(NO_MATCHING_RESOURCE_ERROR);
    expect(mockRelevanceSearch).not.toHaveBeenCalled();
  });

  it('executes a listed index', async () => {
    const result = await runGraph(createModelProvider('devteam-metrics-2026'));

    expect(result.error).toBeUndefined();
    expect(mockNaturalLanguageSearch).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'devteam-metrics-2026' })
    );
  });
});
