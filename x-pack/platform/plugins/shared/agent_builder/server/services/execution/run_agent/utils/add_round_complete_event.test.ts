/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, toArray } from 'rxjs';
import {
  ChatEventType,
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  ConversationRoundStepType,
  ConversationOriginType,
  EventActorType,
  TimelineEventType,
  ToolResultType,
  createRelevantSkillsStep,
  isRoundCompleteEvent,
  isRelevantSkillsStep,
  type ChatAgentEvent,
  type ChatEvent,
  type Conversation,
  type ConversationRound,
  type ConversationRoundStep,
  type RoundInput,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { AgentPromptType, type PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { ConversationStateManager, ModelProvider } from '@kbn/agent-builder-server/runner';
import {
  createAttachmentStateManager,
  type AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
import { createRootStateChunkEvent } from '../../../../test_utils/graph_stream';
import { RunTracker } from '../run_tracker';
import type { StateType } from '../state';
import { applyStepUpdates, stepUpdates, type RunStepUpdate } from '../step_state';
import { RunAttachmentEvents } from '../run_attachment_events';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import {
  roundToEvents,
  promptResponseEvent,
  resumeExecutionToEvents,
} from '../../../conversation/client/rounds_to_events';
import { addRoundCompleteEvent } from './add_round_complete_event';
import { getPendingTurn, type PendingTurn } from './conversation_turn';

const confirmPrompt: PromptRequest = {
  id: 'confirm',
  type: AgentPromptType.confirmation,
  title: 't',
  message: 'm',
};

/**
 * A run as the graph leaves it: the tracker (seed and out-of-band events) plus the steps the graph's
 * reducer produced from the applied updates — what the graph streams as its state.
 */
interface TestRun {
  tracker: RunTracker;
  steps: ConversationRoundStep[];
  apply(updates: RunStepUpdate[]): void;
}

const testRun = (tracker: RunTracker, steps: ConversationRoundStep[]): TestRun => {
  const run: TestRun = {
    tracker,
    steps,
    apply(updates) {
      run.steps = applyStepUpdates(run.steps, updates);
    },
  };
  return run;
};

/** A pending turn folded from a conversation holding the given paused round, plus the resumed run. */
const pendingTurnFor = (
  pendingRound: ConversationRound,
  conversation: Conversation = createEmptyConversation()
): { pendingTurn: PendingTurn; run: TestRun } => {
  const pendingTurn = getPendingTurn({ ...conversation, rounds: [pendingRound] });
  if (!pendingTurn) {
    throw new Error('expected a pending turn');
  }
  const pendingToolCallIds = pendingTurn.state?.agent.nodes.map((node) => node.tool_call_id) ?? [];
  const tracker = new RunTracker({ graphName: 'g' });
  tracker.seed({
    steps: pendingTurn.steps,
    inherited: { steps: pendingTurn.steps, pendingToolCallIds },
  });
  return { pendingTurn, run: testRun(tracker, pendingTurn.steps) };
};

const freshRun = (seed: ConversationRoundStep[] = []): TestRun => {
  const tracker = new RunTracker({ graphName: 'g' });
  tracker.seed({ steps: seed });
  return testRun(tracker, seed);
};

/**
 * Feeds the run's tracker the last state the graph streamed (the final state once the stream
 * completes), as the `values` chunk `run_chat_agent` observes.
 */
const streamedFinalState = (run: TestRun, overrides: Partial<StateType> = {}): TestRun => {
  run.tracker.observeGraphEvent(
    createRootStateChunkEvent('g', {
      currentCycle: 0,
      errorCount: 0,
      steps: run.steps,
      toolRenderState: {},
      ...overrides,
    })
  );
  return run;
};

describe('addRoundCompleteEvent', () => {
  /** The run of the test, when it does not build its own: its tracker is what `createDeps` wires. */
  let defaultRun: TestRun;
  beforeEach(() => {
    defaultRun = freshRun();
  });

  const createDeps = (
    attachmentStateManager: AttachmentStateManager = {
      getAll: jest.fn(() => []),
      drainChanges: jest.fn(() => []),
    } as unknown as AttachmentStateManager
  ) => ({
    pendingTurn: undefined,
    tracker: defaultRun.tracker,
    getConversationState: jest.fn(() => ({})),
    modelProvider: {
      getUsageStats: jest.fn(() => ({ calls: [] })),
    } as unknown as ModelProvider,
    mainConnectorId: 'default-connector',
    stateManager: {} as unknown as ConversationStateManager,
    attachmentStateManager,
    runAttachmentEvents: new RunAttachmentEvents({
      attachmentStateManager,
      roundId: 'round-1',
      triggerEventId: 'round-1::user_message',
      inputActor: { type: EventActorType.user, id: 'u1' },
      agentId: 'agent-1',
    }),
  });

  const messageComplete = (content = 'Done'): ChatAgentEvent =>
    ({
      type: ChatEventType.messageComplete,
      data: { message_id: 'm', message_content: content },
    } as ChatAgentEvent);

  /** The chat events of a run that completed, with its final state fed to the tracker. */
  const completedRun = (
    run: TestRun,
    overrides: Partial<StateType> = {},
    ...events: ChatAgentEvent[]
  ) => {
    streamedFinalState(run, overrides);
    return of(...(events.length > 0 ? events : [messageComplete()]));
  };

  const completedRunEvents = (run: TestRun = defaultRun) => completedRun(run);

  describe('attachment events', () => {
    const typeDefs = {
      getTypeDefinition: (type: string) => ({
        id: type,
        validate: (input: unknown) => ({ valid: true as const, data: input }),
        format: () => ({ getRepresentation: () => ({ type: 'text' as const, value: '' }) }),
      }),
    };

    const runOperator = async ({
      attachmentStateManager,
      runAttachmentEvents,
      userInput,
    }: {
      attachmentStateManager: AttachmentStateManager;
      runAttachmentEvents?: RunAttachmentEvents;
      userInput: RoundInput;
    }) => {
      const deps = createDeps(attachmentStateManager);
      const events = await firstValueFrom(
        completedRunEvents().pipe(
          addRoundCompleteEvent({
            ...deps,
            runAttachmentEvents: runAttachmentEvents ?? deps.runAttachmentEvents,
            roundId: 'round-1',
            userInput,
            startTime: new Date('2026-01-01T00:00:00.000Z'),
          }),
          toArray()
        )
      );
      return events.find(isRoundCompleteEvent)!;
    };

    it('persists the run attachment events and leaves the round input as received', async () => {
      const attachmentStateManager = createAttachmentStateManager([], typeDefs);
      // a change made outside a tool call, still recorded when the run ends
      await attachmentStateManager.add({ id: 'a1', type: 'text', data: 'x' });
      const event = await runOperator({ attachmentStateManager, userInput: { message: 'hi' } });

      expect(event.data.round.input).toEqual({ message: 'hi' });
      expect(event.data.attachment_events).toEqual([
        expect.objectContaining({
          execution_id: 'round-1::execution',
          trigger_event_id: 'round-1::user_message',
          data: expect.objectContaining({ attachment_id: 'a1', source: 'execution', format: 2 }),
        }),
      ]);
    });

    it('persists the events drained earlier in the run before the remaining changes', async () => {
      const attachmentStateManager = createAttachmentStateManager([], typeDefs);
      const { runAttachmentEvents } = createDeps(attachmentStateManager);
      await attachmentStateManager.add({ id: 'user-sent', type: 'text', data: 'x' });
      runAttachmentEvents.drainChatInput();
      await attachmentStateManager
        .forToolCall('c1')
        .add({ id: 'tool-made', type: 'text', data: { content: 'from a tool' } }, 'agent');

      const event = await runOperator({
        attachmentStateManager,
        runAttachmentEvents,
        userInput: { message: 'here is a file' },
      });

      expect(event.data.attachment_events).toEqual([
        expect.objectContaining({
          type: TimelineEventType.attachmentAdded,
          actor: { type: EventActorType.user, id: 'u1' },
          data: expect.objectContaining({ attachment_id: 'user-sent', source: 'chat_input' }),
        }),
        expect.objectContaining({
          type: TimelineEventType.attachmentAdded,
          actor: { type: EventActorType.agent, id: 'agent-1' },
          data: expect.objectContaining({
            attachment_id: 'tool-made',
            source: 'execution',
            tool_call_id: 'c1',
          }),
        }),
      ]);
      // the log was drained by the operator
      expect(attachmentStateManager.drainChanges()).toEqual([]);
    });

    it('omits attachment_events when nothing changed', async () => {
      const attachmentStateManager = createAttachmentStateManager([], typeDefs);
      const event = await runOperator({ attachmentStateManager, userInput: { message: 'hi' } });

      expect(event.data.attachment_events).toBeUndefined();
    });
  });

  it('stamps origin type and author on the round for new rounds', async () => {
    const origin = {
      type: ConversationOriginType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      author: { id: 'U123', full_name: 'Jane Doe', username: 'jane' },
    };
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: {
        message_id: 'message-1',
        message_content: 'Done',
      },
    };

    const events = await firstValueFrom(
      completedRun(defaultRun, {}, messageCompleteEvent as ChatAgentEvent).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          userInput: { message: '@agent summarize this' },
          origin,
          author: origin.author,
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.origin).toEqual({
      type: ConversationOriginType.Slack,
    });
    expect(roundCompleteEvent?.data.round.author).toEqual({
      id: 'U123',
      full_name: 'Jane Doe',
      username: 'jane',
    });
  });

  it('attributes model_usage to the main connector, not a faster helper call that completed first', async () => {
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: {
        message_id: 'message-1',
        message_content: 'Done',
      },
    };

    const events = await firstValueFrom(
      completedRun(defaultRun, {}, messageCompleteEvent as ChatAgentEvent).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          modelProvider: {
            getUsageStats: jest.fn(() => ({
              calls: [
                {
                  connectorId: 'fast-connector',
                  model: 'anthropic-claude-4.5-haiku',
                  tokens: { prompt: 10, completion: 5, total: 15 },
                },
                {
                  connectorId: 'default-connector',
                  model: 'anthropic-claude-4.5-sonnet',
                  tokens: { prompt: 100, completion: 50, total: 150 },
                },
              ],
            })),
          } as unknown as ModelProvider,
          mainConnectorId: 'default-connector',
          userInput: { message: 'use Sonnet' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.model_usage).toEqual({
      connector_id: 'default-connector',
      model: 'anthropic-claude-4.5-sonnet',
      llm_calls: 2,
      input_tokens: 110,
      output_tokens: 55,
    });
  });

  it('records the input tokens of the last LLM call from the final graph state', async () => {
    const events = await firstValueFrom(
      completedRun(defaultRun, { lastCallUsage: { inputTokens: 4242 } }).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          userInput: { message: 'hello' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);
    expect(roundCompleteEvent?.data.round.model_usage.last_call_input_tokens).toBe(4242);
  });

  it('preserves the original round origin and author when resuming a pending round', async () => {
    const pendingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      origin: { type: ConversationOriginType.Slack },
      author: { id: 'U123', full_name: 'Jane Doe', username: 'jane' },
      input: {
        message: '@agent summarize this',
      },
      pending_prompts: [confirmPrompt],
    });
    const { pendingTurn, run } = pendingTurnFor(pendingRound);

    const events = await firstValueFrom(
      completedRun(run).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingTurn,
          tracker: run.tracker,
          userInput: { message: 'continue' },
          origin: {
            type: ConversationOriginType.Slack,
            external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
            author: { id: 'U999', full_name: 'John Roe', username: 'john' },
          },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.origin).toEqual({
      type: ConversationOriginType.Slack,
    });
    expect(roundCompleteEvent?.data.round.author).toEqual({
      id: 'U123',
      full_name: 'Jane Doe',
      username: 'jane',
    });
  });

  it('emits a resume_execution payload whose follow-up leads with the resolved tool-call step', async () => {
    const pausedCall: ToolCallStep = {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: 'call-1',
      tool_id: 'my_tool',
      params: {},
      results: [],
      progression: [{ message: 'Paused' }],
    };
    const pendingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      input: { message: 'delete it' },
      steps: [pausedCall],
      pending_prompts: [confirmPrompt],
      state: {
        version: 2,
        agent: {
          current_cycle: 1,
          error_count: 0,
          nodes: [
            {
              step: 'execute_tool',
              tool_call_id: 'call-1',
              tool_id: 'my_tool',
              tool_params: {},
              tool_state: undefined,
            },
          ],
        },
      },
    });
    const { pendingTurn, run } = pendingTurnFor(pendingRound);

    const resolved = { tool_result_id: 'res-1', type: ToolResultType.other, data: 'resolved' };
    // What `executeTool` emits for the re-run call: its result and the progress observed since.
    run.apply([
      stepUpdates.resolveToolCall({
        toolCallId: 'call-1',
        toolId: 'my_tool',
        results: [resolved],
        progression: [{ message: 'Resumed' }],
      }),
      stepUpdates.append({ type: ConversationRoundStepType.reasoning, reasoning: 'done' }),
    ]);

    const events = await firstValueFrom(
      completedRun(
        run,
        { currentCycle: 1 },
        {
          type: ChatEventType.toolResult,
          data: { tool_call_id: 'call-1', tool_id: 'my_tool', results: [resolved] },
        } as ChatAgentEvent,
        messageComplete('deleted')
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingTurn,
          tracker: run.tracker,
          userInput: { message: '' },
          startTime: new Date('2026-01-01T00:05:00.000Z'),
        }),
        toArray()
      )
    );

    const rc = events.find(isRoundCompleteEvent);
    expect(rc?.data.resumed).toBe(true);
    expect(rc?.data.resume_execution).toBeDefined();

    const followUpSteps = rc!.data.resume_execution!.follow_up_round.steps;
    expect(followUpSteps).toEqual([
      expect.objectContaining({
        tool_call_id: 'call-1',
        results: [resolved],
        progression: [{ message: 'Resumed' }],
      }),
      { type: ConversationRoundStepType.reasoning, reasoning: 'done' },
    ]);
    expect(rc!.data.round.steps).toEqual([
      expect.objectContaining({
        tool_call_id: 'call-1',
        results: [resolved],
        progression: [{ message: 'Paused' }, { message: 'Resumed' }],
      }),
      { type: ConversationRoundStepType.reasoning, reasoning: 'done' },
    ]);
    if (!rc?.data.resume_execution) {
      throw new Error('Expected resume execution');
    }
    const conversation = createEmptyConversation();
    const followUpRound = rc.data.resume_execution.follow_up_round;
    const response = promptResponseEvent({
      roundId: pendingRound.id,
      executionIndex: 1,
      promptRequestedEventId: `${pendingRound.id}::execution_terminated`,
      responses: {},
      input: followUpRound.input,
      conversation,
      createdAt: followUpRound.started_at,
    });
    const reloaded = eventsToRounds([
      ...roundToEvents(pendingRound, conversation),
      response,
      ...resumeExecutionToEvents({
        followUpRound,
        roundId: pendingRound.id,
        executionIndex: 1,
        triggerEventId: response.id,
        conversation,
      }),
    ]);
    expect(reloaded[0].steps).toEqual(rc.data.round.steps);
  });

  it('stamps the resolved author on the round when there is no origin', async () => {
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: {
        message_id: 'message-1',
        message_content: 'Done',
      },
    };

    const events = await firstValueFrom(
      completedRun(defaultRun, {}, messageCompleteEvent as ChatAgentEvent).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          userInput: { message: 'Hello' },
          author: { id: 'profile-1', username: 'jane' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.author).toEqual({ id: 'profile-1', username: 'jane' });
    expect(roundCompleteEvent?.data.round.origin).toBeUndefined();
  });

  it('persists the steps seeded into the tracker, such as the relevant_skills step', async () => {
    const skills = [
      {
        id: 'a.alpha',
        name: 'alpha',
        path: '/p/SKILL.md',
        description: 'Alpha',
        relevance_note: 'fits',
      },
    ];
    const run = freshRun([createRelevantSkillsStep({ skills, source: 'implicit' })]);
    run.apply([
      stepUpdates.append({ type: ConversationRoundStepType.reasoning, reasoning: 'thinking' }),
    ]);

    const events = await firstValueFrom(
      completedRunEvents(run).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          tracker: run.tracker,
          userInput: { message: 'do a thing' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const round = events.find(isRoundCompleteEvent)?.data.round;
    const step = round?.steps.find(isRelevantSkillsStep);
    expect(step).toMatchObject({ source: 'implicit', skills });
    expect(round?.steps.map((s) => s.type)).toEqual([
      ConversationRoundStepType.relevantSkills,
      ConversationRoundStepType.reasoning,
    ]);
  });

  it('drops runtime-only tool calls and keeps the todos step from the final graph state', async () => {
    const serverCall: ToolCallStep = {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: 'srv',
      tool_id: 'my_tool',
      params: {},
      results: [{ tool_result_id: 'r-srv', type: ToolResultType.other, data: {} }],
      progression: [],
      tool_call_group_id: 'g1',
    };
    const browserCall: ToolCallStep = {
      ...serverCall,
      tool_call_id: 'brw',
      tool_id: 'open_tab',
      results: [],
    };
    const updates: RunStepUpdate[] = [
      stepUpdates.appendToolCall({ ...serverCall, results: [] }),
      stepUpdates.appendToolCall(browserCall),
      stepUpdates.resolveToolCall({
        toolCallId: 'srv',
        toolId: 'my_tool',
        results: serverCall.results,
        progression: [],
      }),
      stepUpdates.upsertQuestion({
        type: ConversationRoundStepType.askUserQuestion,
        prompt_id: 'q1',
        questions: [{ question: 'why?', options: [{ label: 'a' }], multi_select: false }],
      }),
      stepUpdates.setTodos({
        type: ConversationRoundStepType.updateTodos,
        todos: [{ content: 'x', status: 'pending' }],
      }),
    ];
    const run = freshRun();
    run.apply(updates);

    const events = await firstValueFrom(
      completedRun(run, {
        currentCycle: 1,
        toolRenderState: {
          srv: { toolName: 'my_tool', kind: 'server' },
          brw: { toolName: 'browser_open_tab', kind: 'browser' },
        },
      }).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          tracker: run.tracker,
          userInput: { message: 'go' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const round = events.find(isRoundCompleteEvent)?.data.round;
    expect(
      round?.steps.map((s) =>
        s.type === ConversationRoundStepType.toolCall ? s.tool_call_id : s.type
      )
    ).toEqual([
      'srv',
      ConversationRoundStepType.askUserQuestion,
      ConversationRoundStepType.updateTodos,
    ]);
  });

  it('persists the final graph steps: the tracker holds no mirror of the run', async () => {
    const run = freshRun();
    const graphOnly: ConversationRoundStep = {
      type: ConversationRoundStepType.reasoning,
      reasoning: 'from the graph',
    };
    const events = await firstValueFrom(
      completedRun(run, { steps: [graphOnly] }).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          tracker: run.tracker,
          userInput: { message: 'go' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );
    const roundComplete = events.find(isRoundCompleteEvent)!;
    expect(roundComplete.data.round.steps).toEqual([graphOnly]);
  });

  it('merges input, attachments, usage, overrides and identity across two resumes like the legacy fold', async () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const author = { id: 'U1', username: 'jane' };
    const origin = { type: ConversationOriginType.Slack };
    const usage = (calls: number, input: number, output: number) => ({
      connector_id: 'default-connector',
      llm_calls: calls,
      input_tokens: input,
      output_tokens: output,
    });
    const conversation = createEmptyConversation({
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    // exec 0: the original run, paused on a confirmation.
    const round0 = createRound({
      id: 'round-1',
      status: ConversationRoundStatus.awaitingPrompt,
      author,
      origin,
      started_at: t0,
      time_to_first_token: 100,
      time_to_last_token: 100,
      model_usage: usage(1, 10, 5),
      input: { message: 'first', attachment_refs: [{ attachment_id: 'a1', version: 1 }] },
      steps: [{ type: ConversationRoundStepType.reasoning, reasoning: 'r0' }],
      pending_prompts: [confirmPrompt],
    });
    // exec 1: a first resume, itself paused again.
    const followUp1 = createRound({
      id: 'round-1',
      status: ConversationRoundStatus.awaitingPrompt,
      started_at: '2026-01-01T00:01:00.000Z',
      time_to_first_token: 200,
      time_to_last_token: 200,
      model_usage: usage(1, 20, 10),
      input: { message: 'continue-1', attachment_refs: [{ attachment_id: 'a2', version: 1 }] },
      steps: [{ type: ConversationRoundStepType.reasoning, reasoning: 'r1' }],
      pending_prompts: [confirmPrompt],
    });
    const response1 = promptResponseEvent({
      roundId: 'round-1',
      executionIndex: 1,
      promptRequestedEventId: 'round-1::execution_terminated',
      responses: {},
      input: followUp1.input,
      conversation,
      createdAt: followUp1.started_at,
    });
    const timeline = [
      ...roundToEvents(round0, conversation),
      response1,
      ...resumeExecutionToEvents({
        followUpRound: followUp1,
        roundId: 'round-1',
        executionIndex: 1,
        triggerEventId: response1.id,
        conversation,
      }),
    ];
    const pendingTurn = getPendingTurn({ ...conversation, events: timeline });
    if (!pendingTurn) {
      throw new Error('expected a pending turn');
    }
    expect(pendingTurn.compatRound.model_usage).toEqual(usage(2, 30, 15));
    const tracker = new RunTracker({ graphName: 'g' });
    tracker.seed({
      steps: pendingTurn.steps,
      inherited: { steps: pendingTurn.steps, pendingToolCallIds: [] },
    });
    const run = testRun(tracker, pendingTurn.steps);
    run.apply([stepUpdates.append({ type: ConversationRoundStepType.reasoning, reasoning: 'r2' })]);

    // exec 2: the second resume, adding usage and configuration overrides.
    const startTime = new Date('2026-01-01T00:02:00.000Z');
    const events = await firstValueFrom(
      completedRun(run, { currentCycle: 2 }, messageComplete('final')).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingTurn,
          tracker: run.tracker,
          modelProvider: {
            getUsageStats: jest.fn(() => ({
              calls: [{ connectorId: 'default-connector', tokens: { prompt: 40, completion: 20 } }],
            })),
          } as unknown as ModelProvider,
          userInput: { message: 'continue-2' },
          author: { id: 'U9', username: 'someone-else' },
          origin: {
            type: ConversationOriginType.Slack,
            external_conversation_id: 'x',
            author: { id: 'U9', username: 'someone-else' },
          },
          configurationOverrides: { instructions: 'be terse' },
          startTime,
          endTime: new Date('2026-01-01T00:02:00.300Z'),
        }),
        toArray()
      )
    );

    const rc = events.find(isRoundCompleteEvent)!;
    const { round, resume_execution: resumeExecution } = rc.data;
    expect(round).toMatchObject({
      id: 'round-1',
      status: ConversationRoundStatus.completed,
      author,
      origin,
      started_at: t0,
      time_to_first_token: 600,
      time_to_last_token: 600,
      model_usage: usage(3, 70, 35),
      configuration_overrides: { instructions: 'be terse' },
      response: { message: 'final' },
      input: {
        message: 'continue-2',
        attachment_refs: [
          { attachment_id: 'a1', version: 1 },
          { attachment_id: 'a2', version: 1 },
        ],
      },
    });
    expect(round.steps).toEqual([
      { type: ConversationRoundStepType.reasoning, reasoning: 'r0' },
      { type: ConversationRoundStepType.reasoning, reasoning: 'r1' },
      { type: ConversationRoundStepType.reasoning, reasoning: 'r2' },
    ]);
    // the resume execution only owns its own step and carries its own summary
    expect(resumeExecution?.follow_up_round).toMatchObject({
      steps: [{ type: ConversationRoundStepType.reasoning, reasoning: 'r2' }],
      started_at: startTime.toISOString(),
      time_to_last_token: 300,
      model_usage: usage(1, 40, 20),
      configuration_overrides: { instructions: 'be terse' },
      input: { message: 'continue-2' },
    });
    expect(resumeExecution?.follow_up_round.input).toEqual({ message: 'continue-2' });
  });
});
