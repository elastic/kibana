/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage } from '@langchain/core/messages';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import { createSearchToolGraph } from './graph';
import { NO_TOOL_SELECTED_ERROR, noMatchingResourceToolName } from './inner_tools';
import { gatherResourceDescriptors } from '../index_explorer';

jest.mock('../index_explorer', () => ({
  ...jest.requireActual('../index_explorer'),
  gatherResourceDescriptors: jest.fn(),
}));

const gatherResourceDescriptorsMock = gatherResourceDescriptors as jest.Mock;

interface BoundToolsOptions {
  tool_choice?: unknown;
}

const createModelProvider = (response: AIMessage) => {
  const bindTools = jest.fn((_tools: unknown, _options?: BoundToolsOptions) => ({
    withConfig: () => ({ invoke: jest.fn(async () => response) }),
  }));

  const modelProvider = {
    getDefaultModel: jest.fn(async () => ({ chatModel: { bindTools } })),
  } as unknown as ModelProvider;

  return { modelProvider, bindTools };
};

describe('createSearchToolGraph', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let events: ToolEventEmitter;

  const invokeGraph = async (response: AIMessage) => {
    const { modelProvider, bindTools } = createModelProvider(response);
    const graph = await createSearchToolGraph({
      modelProvider,
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger,
      events,
    });
    const state = await graph.invoke({ nlQuery: 'find log.dll side-loading' });

    return { state, bindTools };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    events = { reportProgress: jest.fn(), sendUiEvent: jest.fn() };
    gatherResourceDescriptorsMock.mockResolvedValue([
      { type: 'index', name: 'logs-endpoint.events.library-default' },
    ]);
  });

  describe('tool choice', () => {
    it('does not force tool choice when dispatching', async () => {
      // Forcing tool choice makes some providers hang until the request is
      // aborted, which stalls every run routed through the search tool.
      const { state, bindTools } = await invokeGraph(
        new AIMessage({
          content: '',
          tool_calls: [{ id: '1', name: noMatchingResourceToolName, args: {} }],
        })
      );

      expect(bindTools).toHaveBeenCalledTimes(1);
      const [, options] = bindTools.mock.calls[0];
      expect(options?.tool_choice).toBeUndefined();
      expect(state.error).toBeUndefined();
      expect(state.results).toHaveLength(1);
    });
  });

  describe('when the dispatcher selects no tool', () => {
    const proseResponse = () => new AIMessage({ content: 'I cannot search that.' });

    it('ends with an error instead of invoking the tool node', async () => {
      const { state } = await invokeGraph(proseResponse());

      expect(state.error).toBe(NO_TOOL_SELECTED_ERROR);
      expect(state.results).toHaveLength(0);
    });

    it('logs a warning naming the query', async () => {
      await invokeGraph(proseResponse());

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('find log.dll side-loading')
      );
    });
  });
});
