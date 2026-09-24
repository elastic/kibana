/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Overwrite, type Command } from '@langchain/langgraph';
import type {
  BrowserApiToolMetadata,
  CompactionStep,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolOrigin,
  createAskUserQuestionStep,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';

import { createAgentHandlerContextMock } from '../../../test_utils/runner';
import { createEmptyConversation, createRound } from '../../../test_utils/conversations';
import { createMockedExecutableTool } from '../../../test_utils/tools';

import { runDefaultAgentMode } from './run_chat_agent';
import {
  addRoundCompleteEvent,
  prepareConversation,
  selectTools,
  selectSkills,
  extractRound,
  getPendingTurn,
  createPreExecutionSteps,
} from './utils';
import { createAgentGraph } from './graph';
import { createPromptFactory } from './prompts';
import { createImageResolver } from './utils/image_resolver';
import { RunTracker } from './run_tracker';
import { steps as nodeNames } from './constants';
import { applyStepUpdates, stepUpdates } from './step_state';
import { createRootStateChunkEvent } from '../../../test_utils/graph_stream';
import type { StateType } from './state';

// the real fold, so resume tests exercise the actual pending-turn detection
const { getPendingTurn: realGetPendingTurn } = jest.requireActual('./utils/conversation_turn');

jest.mock('./utils', () => ({
  prepareConversation: jest.fn(),
  selectSkills: jest.fn().mockResolvedValue([]),
  selectTools: jest.fn(),
  extractRound: jest.fn(),
  getPendingTurn: jest.fn(() => undefined),
  createPreExecutionSteps: jest.fn(() => []),
  addRoundCompleteEvent: jest.fn(() => (source$: any) => source$),
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
const getPendingTurnMock = getPendingTurn as jest.MockedFn<typeof getPendingTurn>;
const createPreExecutionStepsMock = createPreExecutionSteps as jest.MockedFn<
  typeof createPreExecutionSteps
>;
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

    getPendingTurnMock.mockReturnValue(undefined);

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
      timeline: [],
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

  it('configures the tool-result length guardrail budget on the toolManager', async () => {
    const context = createAgentHandlerContextMock();

    jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
      connector: { name: 'test-connector' },
      chatModel: {} as any,
    } as any);

    context.toolManager.getToolIdMapping.mockReturnValue(new Map());
    context.toolManager.getDynamicToolIds.mockReturnValue([]);

    getPendingTurnMock.mockReturnValue(undefined);

    selectToolsMock.mockResolvedValue({
      staticTools: [],
      dynamicTools: [],
    } as any);

    prepareConversationMock.mockResolvedValue({
      timeline: [],
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
      getPendingTurnMock.mockReturnValue(undefined);
      selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
      prepareConversationMock.mockResolvedValue({
        timeline: [],
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
      getPendingTurnMock.mockReturnValue(undefined);
      selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
      prepareConversationMock.mockResolvedValue({
        timeline: [],
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
    getPendingTurnMock.mockReturnValue(undefined);
    selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
    prepareConversationMock.mockResolvedValue({
      timeline: [],
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

  describe('round_interrupted', () => {
    const setup = () => {
      const context = createAgentHandlerContextMock();
      jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
        connector: { name: 'test-connector', connectorId: 'connector-1' },
        chatModel: {} as any,
      } as any);
      context.toolManager.getToolIdMapping.mockReturnValue(new Map());
      context.toolManager.getDynamicToolIds.mockReturnValue([]);
      (context.attachmentStateManager.getAccessedRefs as jest.Mock).mockReturnValue([]);
      (context.attachmentStateManager.getAll as jest.Mock).mockReturnValue([]);
      getPendingTurnMock.mockReturnValue(undefined);
      selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
      prepareConversationMock.mockResolvedValue({
        timeline: [],
        nextInput: { message: 'hello', attachments: [] },
        attachments: [],
        attachmentTypes: [],
        attachmentStateManager: context.attachmentStateManager,
      } as any);
      extractRoundMock.mockResolvedValue(createRound({ id: 'round-1' }));
      return context;
    };

    it('emits round_interrupted with the steps so far when the graph stream errors', async () => {
      const context = setup();
      const failure = new Error('llm exploded');
      const toolCallStep: ToolCallStep = {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'call-1',
        tool_id: 'my_tool',
        params: {},
        results: [],
        progression: [],
      };
      createAgentGraphMock.mockReturnValue({
        streamEvents: jest.fn(() => ({
          async *[Symbol.asyncIterator]() {
            // The research node records a tool call before the run blows up: LangGraph streams the
            // state after that super-step as a root `values` chunk.
            yield createRootStateChunkEvent('default-agent-builder-agent', {
              steps: applyStepUpdates([], [stepUpdates.appendToolCall(toolCallStep)]),
              toolRenderState: { 'call-1': { toolName: 'my_tool', kind: 'server' } },
            });
            // progress observed by the tool manager's emitter, never drained by the graph
            const emit = context.toolManager.setEventEmitter.mock.calls[0][0];
            emit({
              type: ChatEventType.toolProgress,
              data: { tool_call_id: 'call-1', tool_id: 'my_tool', message: 'halfway' },
            } as any);
            throw failure;
          },
        })),
      } as any);

      await runDefaultAgentMode(
        {
          nextInput: { message: 'hello' },
          agentConfiguration: { tools: [] } as any,
          roundId: 'round-1',
        },
        context
      );
      // `extractRound` is mocked, so the handler returns before the (async) stream fails.
      await new Promise((resolve) => setImmediate(resolve));

      const emitted = (context.events.emit as jest.Mock).mock.calls.map(([event]) => event);
      const interrupted = emitted.find((event) => event.type === ChatEventType.roundInterrupted);
      expect(interrupted).toBeDefined();
      expect(interrupted.data).toMatchObject({
        round_id: 'round-1',
        input: { message: 'hello' },
        attachments: [],
        steps: [
          expect.objectContaining({
            tool_call_id: 'call-1',
            results: [],
            progression: [{ message: 'halfway' }],
          }),
        ],
      });
      expect(interrupted.data.summary.time_to_last_token).toBeGreaterThanOrEqual(0);
      expect(interrupted.data.summary.model_usage).toMatchObject({ connector_id: 'connector-1' });
      // it is the last event of the stream, after every event of the run
      expect(emitted[emitted.length - 1]).toBe(interrupted);
      expect(emitted.map((event) => event.type)).toContain(ChatEventType.roundStarted);
    });

    it('does not emit round_interrupted when the run completes', async () => {
      const context = setup();
      createAgentGraphMock.mockReturnValue({ streamEvents: jest.fn(() => []) } as any);

      await runDefaultAgentMode(
        { nextInput: { message: 'hello' }, agentConfiguration: { tools: [] } as any },
        context
      );

      const types = (context.events.emit as jest.Mock).mock.calls.map(([event]) => event.type);
      expect(types).not.toContain(ChatEventType.roundInterrupted);
    });

    it('still surfaces the original error when the summary cannot be built', async () => {
      const context = setup();
      (context.attachmentStateManager.getAccessedRefs as jest.Mock).mockImplementation(() => {
        throw new Error('state manager broken');
      });
      createAgentGraphMock.mockReturnValue({
        streamEvents: jest.fn(() => ({
          async *[Symbol.asyncIterator]() {
            throw new Error('llm exploded');
          },
        })),
      } as any);

      await runDefaultAgentMode(
        { nextInput: { message: 'hello' }, agentConfiguration: { tools: [] } as any },
        context
      );

      const types = (context.events.emit as jest.Mock).mock.calls.map(([event]) => event.type);
      expect(types).not.toContain(ChatEventType.roundInterrupted);
      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to build round_interrupted summary')
      );
    });
  });

  describe('graph wiring', () => {
    const setup = () => {
      const context = createAgentHandlerContextMock();
      jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
        connector: { name: 'test-connector', connectorId: 'connector-1' },
        chatModel: {} as any,
      } as any);
      context.toolManager.getToolIdMapping.mockReturnValue(new Map([['my_tool', 'my.tool']]));
      context.toolManager.getDynamicToolIds.mockReturnValue([]);
      selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
      prepareConversationMock.mockResolvedValue({
        timeline: [],
        nextInput: { message: 'hello', attachments: [] },
        attachments: [],
        attachmentTypes: [],
        attachmentStateManager: context.attachmentStateManager,
      } as any);
      extractRoundMock.mockResolvedValue(createRound({ id: 'round-1' }));
      const streamEvents = jest.fn(() => []);
      createAgentGraphMock.mockReturnValue({ streamEvents } as any);
      return { context, streamEvents };
    };

    const initialCommand = (streamEvents: jest.Mock): Command<unknown, Partial<StateType>> =>
      streamEvents.mock.calls[0][0];

    it('hands the tracker and the todo state manager to the graph', async () => {
      const { context, streamEvents } = setup();

      await runDefaultAgentMode(
        { nextInput: { message: 'hello' }, agentConfiguration: { tools: [] } as any },
        context
      );

      const graphParams = createAgentGraphMock.mock.calls[0][0];
      expect(graphParams.toolExecutionBuffer).toBeInstanceOf(RunTracker);
      // the root `on_chain_stream` chunks must carry the full state (see `RunTracker`)
      expect((streamEvents.mock.calls[0] as unknown[])[1]).toMatchObject({ streamMode: 'values' });
      expect(graphParams.todoStateManager).toBe(context.todoStateManager);
      // fresh run: starts at init with no pending calls
      const command = initialCommand(streamEvents);
      expect(command.goto).toEqual([nodeNames.init]);
      expect(command.update).not.toHaveProperty('pendingToolCallIds');
      expect(command.update).toMatchObject({ cycleLimit: 30, steps: new Overwrite([]) });
    });

    const pausedCall: ToolCallStep = {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: 'call-1',
      tool_id: 'my.tool',
      params: { q: 1 },
      results: [],
      progression: [],
    };

    it('resumes at executeTool when the pending turn has a paused tool call', async () => {
      const { context, streamEvents } = setup();
      const conversation = createEmptyConversation({
        rounds: [
          createRound({
            id: 'round-1',
            status: ConversationRoundStatus.awaitingPrompt,
            steps: [pausedCall],
            pending_prompts: [
              { id: 'p1', type: AgentPromptType.confirmation, title: 't', message: 'm' },
            ],
            state: {
              version: 2,
              agent: {
                current_cycle: 3,
                error_count: 0,
                nodes: [
                  {
                    step: 'execute_tool',
                    tool_call_id: 'call-1',
                    tool_id: 'my.tool',
                    tool_params: { q: 1 },
                    tool_state: undefined,
                  },
                ],
              },
            },
          }),
        ],
      });
      getPendingTurnMock.mockImplementation(realGetPendingTurn);
      (context.promptManager.dump as jest.Mock).mockReturnValue({ responses: {} });

      await runDefaultAgentMode(
        {
          nextInput: { prompts: { p1: { allow: true } } },
          agentConfiguration: { tools: [] } as any,
          conversation,
        },
        context
      );

      const command = initialCommand(streamEvents);
      expect(command.goto).toEqual([nodeNames.executeTool]);
      expect(command.update).toMatchObject({
        pendingToolCallIds: ['call-1'],
        currentCycle: 3,
        researchOutcome: {
          type: 'tool_calls',
          toolCalls: [{ toolCallId: 'call-1', toolName: 'my_tool', args: { q: 1 } }],
        },
        toolRenderState: { 'call-1': { toolName: 'my_tool', kind: 'server' } },
      });
      expect(context.attachmentStateManager.clearAccessTracking).not.toHaveBeenCalled();
    });

    it('appends the compaction step to a resumed turn as a step owned by the resume execution', async () => {
      const { context, streamEvents } = setup();
      const compaction: CompactionStep = {
        type: ConversationRoundStepType.compaction,
        token_count_before: 100,
        token_count_after: 10,
        summarized_round_count: 1,
      };
      createPreExecutionStepsMock.mockReturnValue([compaction]);
      const conversation = createEmptyConversation({
        rounds: [
          createRound({
            id: 'round-1',
            status: ConversationRoundStatus.awaitingPrompt,
            steps: [pausedCall],
            pending_prompts: [
              { id: 'p1', type: AgentPromptType.confirmation, title: 't', message: 'm' },
            ],
            state: {
              version: 2,
              agent: {
                current_cycle: 1,
                error_count: 0,
                nodes: [
                  {
                    step: 'execute_tool',
                    tool_call_id: 'call-1',
                    tool_id: 'my.tool',
                    tool_params: { q: 1 },
                    tool_state: undefined,
                  },
                ],
              },
            },
          }),
        ],
      });
      getPendingTurnMock.mockImplementation(realGetPendingTurn);
      (context.promptManager.dump as jest.Mock).mockReturnValue({ responses: {} });

      await runDefaultAgentMode(
        {
          nextInput: { prompts: { p1: { allow: true } } },
          agentConfiguration: { tools: [] } as any,
          conversation,
        },
        context
      );

      // the graph is seeded with the inherited steps plus the compaction step
      const command = initialCommand(streamEvents);
      expect(command.update).toMatchObject({ steps: new Overwrite([pausedCall, compaction]) });
      // the tracker attributes the compaction step to this execution, not to the paused one
      const tracker = createAgentGraphMock.mock.calls[0][0].toolExecutionBuffer as RunTracker;
      expect(tracker.latestState().steps).toEqual([pausedCall, compaction]);
      expect(tracker.executionProjection()).toEqual([
        expect.objectContaining({ tool_call_id: 'call-1' }),
        compaction,
      ]);
      createPreExecutionStepsMock.mockReturnValue([]);
    });

    it('resumes at researchAgent when the turn only paused on an ask_user_question', async () => {
      const { context, streamEvents } = setup();
      const question = { question: 'Pick', options: [{ label: 'a' }], multi_select: false };
      const conversation = createEmptyConversation({
        rounds: [
          createRound({
            id: 'round-1',
            status: ConversationRoundStatus.awaitingPrompt,
            steps: [createAskUserQuestionStep({ prompt_id: 'q1', questions: [question] })],
            pending_prompts: [
              { id: 'q1', type: AgentPromptType.ask_user_question, questions: [question] },
            ],
          }),
        ],
      });
      getPendingTurnMock.mockImplementation(realGetPendingTurn);
      (context.promptManager.dump as jest.Mock).mockReturnValue({
        responses: {
          q1: { type: AgentPromptType.ask_user_question, response: { answers: [{ choice: [0] }] } },
        },
      });

      await runDefaultAgentMode(
        {
          nextInput: {
            prompts: { q1: { answers: [{ choice: [0] }] } },
          },
          agentConfiguration: { tools: [] } as any,
          conversation,
        },
        context
      );

      const command = initialCommand(streamEvents);
      expect(command.goto).toEqual([nodeNames.researchAgent]);
      expect(command.update).toMatchObject({ pendingToolCallIds: [], researchOutcome: undefined });
      // the consumed answer is removed from the prompt manager and replayed as an event
      expect(context.promptManager.delete).toHaveBeenCalledWith('q1');
      const emitted = (context.events.emit as jest.Mock).mock.calls.map(([event]) => event);
      expect(emitted).toContainEqual(
        expect.objectContaining({
          type: ChatEventType.userQuestionAnswered,
          data: { prompt_id: 'q1', answers: [{ choice: [0] }] },
        })
      );
    });
  });
});
