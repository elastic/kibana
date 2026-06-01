/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
  ToolOrigin,
} from '@kbn/agent-builder-common';
import type { OtherStep } from '@kbn/agent-builder-common/chat/conversation';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/logging';

import { createAgentHandlerContextMock } from '../../../test_utils/runner';
import { createRound } from '../../../test_utils/conversations';
import { createMockedExecutableTool } from '../../../test_utils/tools';

import { runDefaultAgentMode, createInitializerCommand } from './run_chat_agent';
import type { ProcessedConversationRound } from './utils/prepare_conversation';
import { steps } from './constants';
import { prepareConversation, selectTools, extractRound, getPendingRound } from './utils';
import { createAgentGraph } from './graph';

jest.mock('./utils', () => ({
  prepareConversation: jest.fn(),
  selectSkills: jest.fn().mockResolvedValue([]),
  selectTools: jest.fn(),
  extractRound: jest.fn(),
  getPendingRound: jest.fn(),
  addRoundCompleteEvent: jest.fn(() => (source$: any) => source$),
  evictInternalEvents: jest.fn(() => (source$: any) => source$),
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
});

describe('createInitializerCommand', () => {
  it('does not restore currentCycle when resuming from HITL (completed tool call → checkBackgroundWork)', () => {
    const awaitingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [
        {
          params: {},
          results: [
            {
              data: { status: 'WAITING_FOR_INPUT' },
              tool_result_id: 'r1',
              type: ToolResultType.other,
            },
          ],
          tool_call_group_id: 'group-1',
          tool_call_id: 'tc-1',
          tool_id: 'run_workflow',
          type: ConversationRoundStepType.toolCall,
        },
      ],
      state: {
        agent: { current_cycle: 1, error_count: 0, nodes: [] },
        version: 1,
      },
    }) as unknown as ProcessedConversationRound;

    const command = createInitializerCommand({
      agentBuilderToLangchainIdMap: new Map(),
      conversation: {
        attachmentStateManager: {} as AttachmentStateManager,
        attachmentTypes: [],
        attachments: [],
        nextInput: { attachments: [], message: 'approved' },
        previousRounds: [awaitingRound],
      },
      cycleLimit: 30,
    });

    expect((command.update as Record<string, unknown>)?.currentCycle).toBeUndefined();
    expect(command.goto).toEqual([steps.checkBackgroundWork]);
  });

  it('restores currentCycle when resuming with pending tool calls (no results → executeTool)', () => {
    const awaitingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [
        {
          params: {},
          results: [],
          tool_call_group_id: 'group-1',
          tool_call_id: 'tc-1',
          tool_id: 'run_workflow',
          type: ConversationRoundStepType.toolCall,
        },
      ],
      state: {
        agent: { current_cycle: 2, error_count: 0, nodes: [] },
        version: 1,
      },
    }) as unknown as ProcessedConversationRound;

    const command = createInitializerCommand({
      agentBuilderToLangchainIdMap: new Map(),
      conversation: {
        attachmentStateManager: {} as AttachmentStateManager,
        attachmentTypes: [],
        attachments: [],
        nextInput: { attachments: [], message: '' },
        previousRounds: [awaitingRound],
      },
      cycleLimit: 30,
    });

    expect((command.update as Record<string, unknown>)?.currentCycle).toBe(2);
    expect(command.goto).toEqual([steps.executeTool]);
  });

  it('restores currentCycle when the last round is not awaitingPrompt', () => {
    const completedRound = createRound({
      state: {
        agent: { current_cycle: 5, error_count: 0, nodes: [] },
        version: 1,
      },
      status: ConversationRoundStatus.completed,
    }) as unknown as ProcessedConversationRound;

    const command = createInitializerCommand({
      agentBuilderToLangchainIdMap: new Map(),
      conversation: {
        attachmentStateManager: {} as AttachmentStateManager,
        attachmentTypes: [],
        attachments: [],
        nextInput: { attachments: [], message: 'new message' },
        previousRounds: [completedRound],
      },
      cycleLimit: 30,
    });

    expect((command.update as Record<string, unknown>)?.currentCycle).toBe(5);
    expect(command.goto).toEqual([steps.init]);
  });

  it('routes to checkBackgroundWork (not executeTool) when isFormSubmissionSealedRound=true but round has no tool calls', () => {
    // Represents the second "text response + form prompt" round (round 2) in a multi-step
    // HITL flow. The LLM generated prose rather than invoking a tool, so there are no
    // ToolCallSteps. roundToActions returns [] for this round.
    // Before the fix, the else-branch blindly set startAt=executeTool, causing executeTool
    // to crash with "Cannot read properties of undefined (reading 'type')" because
    // state.mainActions was empty.
    const hitlFormResponseStep: OtherStep = {
      kind: 'hitl_form_response',
      execution_id: 'exec-1',
      step_execution_id: 'step-2',
      submitted_at: '2024-01-01T00:00:00.000Z',
      values: { approved: true },
      type: ConversationRoundStepType.other,
    };

    const sealedRound = createRound({
      status: ConversationRoundStatus.completed,
      steps: [hitlFormResponseStep as any],
      state: {
        agent: { current_cycle: 1, error_count: 0, nodes: [] },
        version: 1,
      },
    }) as unknown as ProcessedConversationRound;

    const command = createInitializerCommand({
      agentBuilderToLangchainIdMap: new Map(),
      conversation: {
        attachmentStateManager: {} as AttachmentStateManager,
        attachmentTypes: [],
        attachments: [],
        nextInput: { attachments: [], message: '' },
        previousRounds: [sealedRound],
      },
      cycleLimit: 30,
    });

    // Must NOT route to executeTool — that node requires a non-empty mainActions.
    expect(command.goto).toEqual([steps.checkBackgroundWork]);
    // currentCycle must NOT be restored so checkBackgroundWork is not throttled.
    expect((command.update as Record<string, unknown>)?.currentCycle).toBeUndefined();
  });

  it('passes logger and resumedStates to roundToActions, refreshing stale workflow executions', () => {
    const mockLogger = { debug: jest.fn(), error: jest.fn() } as unknown as Logger;

    const awaitingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [
        {
          params: {},
          results: [
            {
              data: {
                execution: {
                  execution_id: 'exec-stale',
                  started_at: '2024-01-01T00:00:00.000Z',
                  status: 'WAITING_FOR_INPUT',
                  workflow_id: 'wf-1',
                },
              },
              tool_result_id: 'r1',
              type: ToolResultType.other,
            },
          ],
          tool_call_group_id: 'group-1',
          tool_call_id: 'tc-1',
          tool_id: 'run_workflow',
          type: ConversationRoundStepType.toolCall,
        },
      ],
      state: {
        agent: { current_cycle: 1, error_count: 0, nodes: [] },
        version: 1,
      },
    }) as unknown as ProcessedConversationRound;

    const resumedStates = [
      { execution_id: 'exec-stale', observedExecution: null, observedStatus: 'completed' },
    ];

    const command = createInitializerCommand({
      agentBuilderToLangchainIdMap: new Map(),
      conversation: {
        attachmentStateManager: {} as AttachmentStateManager,
        attachmentTypes: [],
        attachments: [],
        nextInput: { attachments: [], message: 'approved' },
        previousRounds: [awaitingRound],
      },
      cycleLimit: 30,
      logger: mockLogger,
      resumedStates,
    });

    const mainActions = (command.update as Record<string, unknown>)?.mainActions as Array<{
      tool_results?: Array<{ content: string }>;
    }>;

    const executeToolAction = mainActions?.find((a) => a.tool_results !== undefined);
    const content = executeToolAction?.tool_results?.[0]?.content ?? '';

    expect(content).toContain('completed');
    expect(content).not.toContain('WAITING_FOR_INPUT');
  });
});
