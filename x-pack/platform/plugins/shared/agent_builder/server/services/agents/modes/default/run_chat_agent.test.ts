/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';

import { createAgentHandlerContextMock } from '../../../../test_utils/runner';
import { createRound } from '../../../../test_utils/conversations';

import { runDefaultAgentMode } from './run_chat_agent';
import { prepareConversation, selectTools, extractRound, getPendingRound } from '../utils';
import { createAgentGraph } from './graph';

jest.mock('../utils', () => ({
  prepareConversation: jest.fn(),
  selectTools: jest.fn(),
  extractRound: jest.fn(),
  getPendingRound: jest.fn(),
  addRoundCompleteEvent: jest.fn(() => (source$: any) => source$),
  evictInternalEvents: jest.fn(() => (source$: any) => source$),
}));

jest.mock('../utils/create_result_transformer', () => ({
  createResultTransformer: jest.fn(() => ({})),
}));

jest.mock('./prompts', () => ({
  createPromptFactory: jest.fn(() => ({})),
}));

jest.mock('./graph', () => ({
  createAgentGraph: jest.fn(),
}));

jest.mock('./convert_graph_events', () => ({
  convertGraphEvents: jest.fn(() => (source$: any) => source$),
}));

const prepareConversationMock = prepareConversation as jest.MockedFn<typeof prepareConversation>;
const selectToolsMock = selectTools as jest.MockedFn<typeof selectTools>;
const extractRoundMock = extractRound as jest.MockedFn<typeof extractRound>;
const getPendingRoundMock = getPendingRound as jest.MockedFn<typeof getPendingRound>;
const createAgentGraphMock = createAgentGraph as jest.MockedFn<typeof createAgentGraph>;

describe('runDefaultAgentMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds static and dynamic tools to the toolManager', async () => {
    const context = createAgentHandlerContextMock();

    jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
      connector: { name: 'test-connector' },
      chatModel: {} as any,
    } as any);

    context.toolManager.getToolIdMapping.mockReturnValue(new Map());
    context.toolManager.getDynamicToolIds.mockReturnValue([]);

    getPendingRoundMock.mockReturnValue(undefined);

    const staticTools = [{ id: 'static-tool-1' } as ExecutableTool];
    const dynamicTools = [{ id: 'dynamic-tool-1' } as ExecutableTool];

    selectToolsMock.mockResolvedValue({
      staticTools,
      dynamicTools,
    } as any);

    prepareConversationMock.mockResolvedValue({
      previousRounds: [],
      nextInput: { message: 'hello', attachments: [] },
      attachments: [],
      attachmentTypes: [],
      attachmentStateManager: context.attachmentStateManager,
    } as any);

    extractRoundMock.mockResolvedValue(
      createRound({
        id: 'round-1',
      })
    );

    createAgentGraphMock.mockReturnValue({
      streamEvents: jest.fn(() => []),
    } as any);

    const browserApiTools: BrowserApiToolMetadata[] = [
      {
        id: 'browser-tool-1',
        description: 'browser tool',
        schema: { type: 'object', properties: {} },
      },
    ];

    await runDefaultAgentMode(
      {
        nextInput: { message: 'hello' },
        agentConfiguration: { tools: [] } as any,
        browserApiTools,
      },
      context
    );

    expect(context.toolManager.addTools).toHaveBeenCalledTimes(3);

    // Static tools are added first (executable tools + browser API tools)
    expect(context.toolManager.addTools).toHaveBeenNthCalledWith(1, {
      type: ToolManagerToolType.executable,
      tools: staticTools,
      logger: context.logger,
    });
    expect(context.toolManager.addTools).toHaveBeenNthCalledWith(2, {
      type: ToolManagerToolType.browser,
      tools: browserApiTools,
    });

    // Dynamic tools are added afterwards with the dynamic flag
    expect(context.toolManager.addTools).toHaveBeenNthCalledWith(
      3,
      {
        type: ToolManagerToolType.executable,
        tools: dynamicTools,
        logger: context.logger,
      },
      { dynamic: true }
    );
  });
});
