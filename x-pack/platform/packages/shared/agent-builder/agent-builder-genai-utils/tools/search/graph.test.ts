/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage } from '@langchain/core/messages';
import { createSearchToolGraph } from './graph';
import { NO_TOOL_SELECTED_ERROR } from './inner_tools';

jest.mock('../index_explorer', () => {
  const actual = jest.requireActual('../index_explorer');
  return {
    ...actual,
    gatherResourceDescriptors: jest.fn(async () => [
      { type: 'index', name: 'logs-endpoint.events.library-default' },
    ]),
  };
});

jest.mock('../steps/list_search_sources', () => ({
  listSearchSources: jest.fn(async () => ({
    indices: [],
    aliases: [],
    data_streams: [],
    datasets: [],
  })),
}));

const createLogger = () =>
  ({
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    get: jest.fn(),
    isLevelEnabled: jest.fn(() => true),
  } as any);

/**
 * Builds a model provider whose chat model records how `bindTools` was called
 * and returns whatever message the test supplies.
 */
const createModelProvider = (response: AIMessage) => {
  const bindTools = jest.fn(function (this: unknown, _tools: unknown, options?: unknown) {
    return {
      __bindToolsOptions: options,
      withConfig: () => ({
        invoke: jest.fn(async () => response),
      }),
    };
  });

  const chatModel = { bindTools };

  return {
    provider: {
      getDefaultModel: jest.fn(async () => ({ chatModel })),
    } as any,
    bindTools,
  };
};

describe('createSearchToolGraph tool choice', () => {
  const baseArgs = () => ({
    esClient: {} as any,
    logger: createLogger(),
    events: { reportProgress: jest.fn() } as any,
  });

  it('does NOT force tool choice when dispatching the search tool', async () => {
    // Regression guard: `tool_choice: 'any'`/'required' makes some providers
    // (z.ai GLM 5.2) hang until the request is aborted ~120s later, stalling the
    // whole agent run. The dispatcher must leave tool choice unforced.
    const toolCallResponse = new AIMessage({
      content: '',
      tool_calls: [{ id: '1', name: 'natural_language_search', args: { query: 'q' } }],
    });
    const { provider, bindTools } = createModelProvider(toolCallResponse);

    const graph = await createSearchToolGraph({ modelProvider: provider, ...baseArgs() });
    await graph.invoke({ nlQuery: 'find log.dll side-loading' }).catch(() => undefined);

    expect(bindTools).toHaveBeenCalled();
    const [, options] = bindTools.mock.calls[0];
    // Either no options at all, or options that do not force a tool call.
    const forced =
      options && typeof options === 'object' && 'tool_choice' in (options as object)
        ? (options as { tool_choice?: unknown }).tool_choice
        : undefined;
    expect(forced).not.toBe('any');
    expect(forced).not.toBe('required');
  });

  it('ends with an error instead of throwing when the dispatcher selects no tool', async () => {
    // With unforced tool choice a model may answer in prose. That must surface
    // as a clean error rather than invoking ToolNode without a tool call.
    const proseResponse = new AIMessage({ content: 'I cannot search that.' });
    const { provider } = createModelProvider(proseResponse);

    const graph = await createSearchToolGraph({ modelProvider: provider, ...baseArgs() });
    const result = await graph.invoke({ nlQuery: 'find log.dll side-loading' });

    expect(result.error).toBe(NO_TOOL_SELECTED_ERROR);
  });
});
