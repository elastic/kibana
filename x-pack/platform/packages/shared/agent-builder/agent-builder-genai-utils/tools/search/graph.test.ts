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

jest.mock('../index_explorer', () => ({
  ...jest.requireActual('../index_explorer'),
  gatherResourceDescriptors: jest.fn(),
}));

jest.mock('../nl_search', () => ({
  naturalLanguageSearch: jest.fn(),
}));

jest.mock('../relevance_search', () => ({
  relevanceSearch: jest.fn(),
}));

import { gatherResourceDescriptors } from '../index_explorer';
import { naturalLanguageSearch } from '../nl_search';
import { relevanceSearch } from '../relevance_search';

const mockGatherResourceDescriptors = jest.mocked(gatherResourceDescriptors);
const mockNaturalLanguageSearch = jest.mocked(naturalLanguageSearch);
const mockRelevanceSearch = jest.mocked(relevanceSearch);

const createModelProvider = (index: string, toolName = naturalLanguageSearchToolName) => {
  const args =
    toolName === relevanceSearchToolName
      ? { term: 'sample records', index }
      : { query: 'sample records', index };
  const invoke = jest.fn().mockResolvedValue(
    new AIMessage({
      content: '',
      tool_calls: [{ id: 'call-1', name: toolName, args }],
    })
  );
  const chatModel = {
    bindTools: jest.fn(() => ({ withConfig: jest.fn(() => ({ invoke })) })),
  };
  return {
    getDefaultModel: jest.fn().mockResolvedValue({ chatModel }),
  } as unknown as ModelProvider;
};

const runGraph = async (modelProvider: ModelProvider) => {
  const graph = await createSearchToolGraph({
    modelProvider,
    esClient: {} as ElasticsearchClient,
    logger: loggerMock.create(),
    events: { reportProgress: jest.fn() } as unknown as ToolEventEmitter,
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
    jest.clearAllMocks();
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
