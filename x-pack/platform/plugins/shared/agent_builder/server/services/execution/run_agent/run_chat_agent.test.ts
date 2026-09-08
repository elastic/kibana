/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { ToolOrigin } from '@kbn/agent-builder-common';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';

import { createAgentHandlerContextMock } from '../../../test_utils/runner';
import { createRound } from '../../../test_utils/conversations';
import { createMockedExecutableTool } from '../../../test_utils/tools';

import { runDefaultAgentMode } from './run_chat_agent';
import {
  addRoundCompleteEvent,
  prepareConversation,
  selectTools,
  selectSkills,
  extractRound,
  getPendingRound,
} from './utils';
import { createAgentGraph } from './graph';
import { createPromptFactory } from './prompts';
import { createImageResolver } from './utils/image_resolver';

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

jest.mock('./utils/image_resolver', () => ({
  createImageResolver: jest.fn(() => jest.fn()),
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
const selectSkillsMock = selectSkills as jest.MockedFn<typeof selectSkills>;
const extractRoundMock = extractRound as jest.MockedFn<typeof extractRound>;
const getPendingRoundMock = getPendingRound as jest.MockedFn<typeof getPendingRound>;
const createAgentGraphMock = createAgentGraph as jest.MockedFn<typeof createAgentGraph>;
const addRoundCompleteEventMock = addRoundCompleteEvent as jest.MockedFn<
  typeof addRoundCompleteEvent
>;
const createPromptFactoryMock = createPromptFactory as jest.MockedFn<typeof createPromptFactory>;
const createImageResolverMock = createImageResolver as jest.MockedFn<typeof createImageResolver>;

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

  it('passes the effective agent configuration and space ID to the beforeAgent hook', async () => {
    const context = createAgentHandlerContextMock();
    jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
      connector: { name: 'test-connector' },
      chatModel: {},
    } as any);
    context.toolManager.getToolIdMapping.mockReturnValue(new Map());
    context.toolManager.getDynamicToolIds.mockReturnValue([]);
    getPendingRoundMock.mockReturnValue(undefined);
    selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
    prepareConversationMock.mockResolvedValue({
      previousRounds: [],
      nextInput: { message: 'hello', attachments: [] },
      attachments: [],
      attachmentTypes: [],
      attachmentStateManager: context.attachmentStateManager,
    } as any);
    extractRoundMock.mockResolvedValue(createRound({ id: 'round-1' }));
    createAgentGraphMock.mockReturnValue({ streamEvents: jest.fn(() => []) } as any);
    const agentConfiguration = {
      tools: [{ tool_ids: ['platform.memory.recall'] }],
      enable_elastic_capabilities: false,
    };

    await runDefaultAgentMode(
      {
        nextInput: { message: 'hello' },
        agentConfiguration,
      },
      context
    );

    expect(context.hooks.run).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ agentConfiguration, spaceId: context.spaceId })
    );
  });

  it('configures the tool-result length guardrail budget on the toolManager', async () => {
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
        nextInput: { message: 'hello' },
        agentConfiguration: { tools: [] } as any,
      },
      context
    );

    expect(context.toolManager.setMaxToolResultTokens).toHaveBeenCalledWith(20_000);
  });

  describe('plugin skill id filtering', () => {
    const setupBase = async (context: ReturnType<typeof createAgentHandlerContextMock>) => {
      jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
        connector: { name: 'test-connector' },
        chatModel: {} as any,
      } as any);
      context.toolManager.getToolIdMapping.mockReturnValue(new Map());
      context.toolManager.getDynamicToolIds.mockReturnValue([]);
      getPendingRoundMock.mockReturnValue(undefined);
      selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
      prepareConversationMock.mockResolvedValue({
        previousRounds: [],
        nextInput: { message: 'hello', attachments: [] },
        attachments: [],
        attachmentTypes: [],
        attachmentStateManager: context.attachmentStateManager,
      } as any);
      extractRoundMock.mockResolvedValue(createRound({ id: 'round-1' }));
      createAgentGraphMock.mockReturnValue({ streamEvents: jest.fn(() => []) } as any);
    };

    it('passes all plugin skill ids to selectSkills when no skill_ids override is set', async () => {
      const context = createAgentHandlerContextMock();
      await setupBase(context);

      context.plugins.resolveSkillIds.mockResolvedValue(['skill-a', 'skill-b', 'skill-c']);

      await runDefaultAgentMode(
        {
          nextInput: { message: 'hello' },
          agentConfiguration: { tools: [], plugin_ids: ['plugin-1'] } as any,
        },
        context
      );

      expect(selectSkillsMock).toHaveBeenCalledWith(
        expect.objectContaining({ additionalSkillIds: ['skill-a', 'skill-b', 'skill-c'] })
      );
    });

    it('filters plugin skill ids to the override list when skill_ids override is set', async () => {
      const context = createAgentHandlerContextMock();
      await setupBase(context);

      context.plugins.resolveSkillIds.mockResolvedValue(['skill-a', 'skill-b', 'skill-c']);

      await runDefaultAgentMode(
        {
          nextInput: { message: 'hello' },
          agentConfiguration: { tools: [], plugin_ids: ['plugin-1'] } as any,
          configurationOverrides: { skill_ids: ['skill-a', 'skill-c'] },
        },
        context
      );

      expect(selectSkillsMock).toHaveBeenCalledWith(
        expect.objectContaining({ additionalSkillIds: ['skill-a', 'skill-c'] })
      );
    });

    it('passes an empty list to selectSkills when no plugin skill ids match the override', async () => {
      const context = createAgentHandlerContextMock();
      await setupBase(context);

      context.plugins.resolveSkillIds.mockResolvedValue(['skill-a', 'skill-b']);

      await runDefaultAgentMode(
        {
          nextInput: { message: 'hello' },
          agentConfiguration: { tools: [], plugin_ids: ['plugin-1'] } as any,
          configurationOverrides: { skill_ids: ['skill-c'] },
        },
        context
      );

      expect(selectSkillsMock).toHaveBeenCalledWith(
        expect.objectContaining({ additionalSkillIds: [] })
      );
    });
  });

  describe('threaded roundId', () => {
    const setupBase = async (context: ReturnType<typeof createAgentHandlerContextMock>) => {
      jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
        connector: { name: 'test-connector' },
        chatModel: {} as any,
      } as any);
      context.toolManager.getToolIdMapping.mockReturnValue(new Map());
      context.toolManager.getDynamicToolIds.mockReturnValue([]);
      getPendingRoundMock.mockReturnValue(undefined);
      selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
      prepareConversationMock.mockResolvedValue({
        previousRounds: [],
        nextInput: { message: 'hello', attachments: [] },
        attachments: [],
        attachmentTypes: [],
        attachmentStateManager: context.attachmentStateManager,
      } as any);
      extractRoundMock.mockResolvedValue(createRound({ id: 'round-1' }));
      createAgentGraphMock.mockReturnValue({ streamEvents: jest.fn(() => []) } as any);
    };

    it('uses the caller-provided roundId when threaded from the execution runner', async () => {
      const context = createAgentHandlerContextMock();
      await setupBase(context);

      await runDefaultAgentMode(
        {
          nextInput: { message: 'hello' },
          agentConfiguration: { tools: [] } as any,
          roundId: 'preminted-round-id',
        },
        context
      );

      expect(addRoundCompleteEventMock).toHaveBeenCalledWith(
        expect.objectContaining({ roundId: 'preminted-round-id' })
      );
    });

    it('mints its own roundId when the caller does not provide one (legacy path)', async () => {
      const context = createAgentHandlerContextMock();
      await setupBase(context);

      await runDefaultAgentMode(
        {
          nextInput: { message: 'hello' },
          agentConfiguration: { tools: [] } as any,
        },
        context
      );

      const call = addRoundCompleteEventMock.mock.calls[0][0];
      expect(typeof call.roundId).toBe('string');
      expect(call.roundId).not.toBe('preminted-round-id');
      // UUID v4 format sanity: 36 chars with dashes at expected positions.
      expect(call.roundId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  it('passes an image resolver built from the attachment state manager to the prompt factory', async () => {
    const context = createAgentHandlerContextMock();
    jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
      connector: { name: 'test-connector' },
      chatModel: {} as any,
    } as any);
    context.toolManager.getToolIdMapping.mockReturnValue(new Map());
    context.toolManager.getDynamicToolIds.mockReturnValue([]);
    getPendingRoundMock.mockReturnValue(undefined);
    selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
    prepareConversationMock.mockResolvedValue({
      previousRounds: [],
      nextInput: { message: 'hello', attachments: [] },
      attachments: [],
      attachmentTypes: [],
      attachmentStateManager: context.attachmentStateManager,
    } as any);
    extractRoundMock.mockResolvedValue(createRound({ id: 'round-1' }));
    createAgentGraphMock.mockReturnValue({ streamEvents: jest.fn(() => []) } as any);

    await runDefaultAgentMode(
      {
        nextInput: { message: 'hello' },
        agentConfiguration: { tools: [] } as any,
      },
      context
    );

    expect(createImageResolverMock).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentStateManager: context.attachmentStateManager })
    );
    expect(createPromptFactoryMock.mock.calls[0][0].imageResolver).toBe(
      createImageResolverMock.mock.results[0].value
    );
  });
});
