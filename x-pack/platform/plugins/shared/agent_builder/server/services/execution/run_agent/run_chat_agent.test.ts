/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { ConversationSourceType, ToolOrigin } from '@kbn/agent-builder-common';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';

import { createAgentHandlerContextMock } from '../../../test_utils/runner';
import { createRound } from '../../../test_utils/conversations';
import { createMockedExecutableTool } from '../../../test_utils/tools';

import { runDefaultAgentMode } from './run_chat_agent';
import { prepareConversation, selectTools, extractRound, getPendingRound } from './utils';
import { createAgentGraph } from './graph';
import { createPromptFactory } from './prompts';

const mockSlackOutputSchema = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description:
        'Slack mrkdwn text to post back to the conversation. Use *bold* (single asterisks), _italic_ (underscores), ~strikethrough~, `inline code`, triple-backtick code blocks without language tags, links as <https://example.com|label>, and "-" bullet lists. Do not use GitHub markdown links, headings, tables, or horizontal rules. Keep it concise and conversational.',
    },
  },
  required: ['text'],
  additionalProperties: false,
};

jest.mock('./utils', () => ({
  prepareConversation: jest.fn(),
  selectSkills: jest.fn().mockResolvedValue([]),
  selectTools: jest.fn(),
  extractRound: jest.fn(),
  getPendingRound: jest.fn(),
  addRoundCompleteEvent: jest.fn(() => (source$: any) => source$),
  evictInternalEvents: jest.fn(() => (source$: any) => source$),
  estimatePerRoundTokens: jest.fn().mockResolvedValue([]),
}));

jest.mock('./tools/register_internal_tools', () => ({
  registerInternalTools: jest.fn(),
}));

jest.mock('./utils/create_result_transformer', () => ({
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
const createPromptFactoryMock = createPromptFactory as jest.MockedFn<typeof createPromptFactory>;

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

    const staticTools: ExecutableToolWithOrigin[] = [
      { ...createMockedExecutableTool({ id: 'static-tool-1' }), origin: ToolOrigin.registry },
    ];
    const dynamicTools: ExecutableToolWithOrigin[] = [
      { ...createMockedExecutableTool({ id: 'dynamic-tool-1' }), origin: ToolOrigin.inline },
    ];

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
      tools: [{ ...browserApiTools[0], origin: ToolOrigin.internal }],
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

  it('configures sourced runs with the source output schema', async () => {
    const context = createAgentHandlerContextMock();

    jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
      connector: { name: 'test-connector' },
      chatModel: {} as any,
    } as any);

    context.toolManager.getToolIdMapping.mockReturnValue(new Map());
    context.toolManager.getDynamicToolIds.mockReturnValue([]);

    getPendingRoundMock.mockReturnValue(undefined);

    selectToolsMock.mockResolvedValue({
      staticTools: [],
      dynamicTools: [],
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

    await runDefaultAgentMode(
      {
        nextInput: {
          message: 'hello',
          source: {
            input: {
              channel: 'C123',
              text: 'hello',
              ts: '1712345678.000100',
            },
          },
        },
        roundSourceInput: {
          source: {
            type: ConversationSourceType.Slack,
          },
        },
        structuredOutput: true,
        outputSchema: mockSlackOutputSchema,
        conversation: {
          id: 'conversation-1',
          agent_id: 'agent-1',
          title: 'Test conversation',
          created_at: '2026-07-09T00:00:00.000Z',
          updated_at: '2026-07-09T00:00:00.000Z',
          user: { id: 'user-1', username: 'test-user' },
          rounds: [],
          source: {
            external_conversation_id: 'T1:C1:123',
          },
        } as any,
        agentConfiguration: { tools: [] } as any,
      },
      context
    );

    expect(context.toolManager.setMaxToolResultTokens).toHaveBeenCalledWith(20_000);
    expect(createPromptFactoryMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        sourceAdapter: expect.anything(),
      })
    );
    expect(createAgentGraphMock).toHaveBeenCalledWith(
      expect.objectContaining({
        structuredOutput: true,
        outputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description:
                'Slack mrkdwn text to post back to the conversation. Use *bold* (single asterisks), _italic_ (underscores), ~strikethrough~, `inline code`, triple-backtick code blocks without language tags, links as <https://example.com|label>, and "-" bullet lists. Do not use GitHub markdown links, headings, tables, or horizontal rules. Keep it concise and conversational.',
            },
          },
          required: ['text'],
          additionalProperties: false,
        },
      })
    );
  });
});
