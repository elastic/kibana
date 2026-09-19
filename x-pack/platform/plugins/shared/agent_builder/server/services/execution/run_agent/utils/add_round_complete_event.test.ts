/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, toArray } from 'rxjs';
import type { Logger } from '@kbn/core/server';
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
  type ChatEvent,
  type Conversation,
  type ConversationRound,
  type ConversationRoundStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { AgentPromptType, type PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { ConversationStateManager, ModelProvider } from '@kbn/agent-builder-server/runner';
import {
  createAttachmentStateManager,
  type AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
import type { ConvertedEvents } from '../convert_graph_events';
import { createFinalStateEvent } from '../events';
import { RunStepTracker } from '../run_step_tracker';
import type { StateType } from '../state';
import { applyStepUpdates, stepUpdates, type RunStepUpdate } from '../step_state';
import { fromEs, toEs } from '../../../conversation/client/converters';
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

/** A pending turn folded from a conversation holding the given paused round, plus a seeded tracker. */
const pendingTurnFor = (
  pendingRound: ConversationRound,
  conversation: Conversation = createEmptyConversation()
): { pendingTurn: PendingTurn; tracker: RunStepTracker } => {
  const pendingTurn = getPendingTurn({ ...conversation, rounds: [pendingRound] });
  if (!pendingTurn) {
    throw new Error('expected a pending turn');
  }
  const pendingToolCallIds = pendingTurn.state?.agent.nodes.map((node) => node.tool_call_id) ?? [];
  const tracker = new RunStepTracker({ graphName: 'g' });
  tracker.seed(pendingTurn.steps, { execution: 'resume', pendingToolCallIds });
  return { pendingTurn, tracker };
};

const freshTracker = (seed: ConversationRoundStep[] = []) => {
  const tracker = new RunStepTracker({ graphName: 'g' });
  tracker.seed(seed, { execution: 'fresh', pendingToolCallIds: [] });
  return tracker;
};

/** The graph's final state as `FinalStateEvent` carries it, mirroring the tracker's steps. */
const finalState = (tracker: RunStepTracker, overrides: Partial<StateType> = {}): ConvertedEvents =>
  createFinalStateEvent({
    currentCycle: 0,
    errorCount: 0,
    steps: tracker.getSteps(),
    toolRenderState: {},
    ...overrides,
  } as StateType) as ConvertedEvents;

describe('addRoundCompleteEvent', () => {
  const createDeps = () => ({
    pendingTurn: undefined,
    tracker: freshTracker(),
    logger: { warn: jest.fn() } as unknown as Logger,
    getConversationState: jest.fn(() => ({})),
    modelProvider: {
      getUsageStats: jest.fn(() => ({ calls: [] })),
    } as unknown as ModelProvider,
    mainConnectorId: 'default-connector',
    stateManager: {} as unknown as ConversationStateManager,
    attachmentStateManager: {
      getAccessedRefs: jest.fn(() => []),
      getAll: jest.fn(() => []),
      drainChanges: jest.fn(() => []),
    } as unknown as AttachmentStateManager,
    chatInputChanges: [],
    agentId: 'agent-1',
    conversation: undefined,
  });

  const messageComplete = (content = 'Done'): ConvertedEvents =>
    ({
      type: ChatEventType.messageComplete,
      data: { message_id: 'm', message_content: content },
    } as ConvertedEvents);

  const completedRunEvents = (tracker: RunStepTracker = freshTracker()) =>
    of(finalState(tracker), messageComplete());

  describe('attachment events', () => {
    const typeDefs = {
      getTypeDefinition: (type: string) => ({
        id: type,
        validate: (input: unknown) => ({ valid: true as const, data: input }),
        format: () => ({ getRepresentation: () => ({ type: 'text' as const, value: '' }) }),
      }),
    };

    it('emits chat_input and execution attachment events with actors and the round execution id', async () => {
      const attachmentStateManager = createAttachmentStateManager([], typeDefs);
      // Changes made by tools during the round: still sitting in the state manager's log.
      await attachmentStateManager.add(
        { id: 'tool-made', type: 'text', data: { content: 'from a tool' } },
        'agent'
      );
      // Changes made by the incoming message: already drained by run_chat_agent after prepareConversation.
      const chatInputChanges = [
        {
          kind: 'added' as const,
          attachment_id: 'user-sent',
          attachment_type: 'text',
          current_version: 1,
        },
      ];

      const events = await firstValueFrom(
        completedRunEvents().pipe(
          addRoundCompleteEvent({
            ...createDeps(),
            attachmentStateManager,
            chatInputChanges,
            agentId: 'agent-1',
            roundId: 'round-1',
            userInput: { message: 'here is a file' },
            author: { id: 'profile-1', username: 'jane' },
            startTime: new Date('2026-01-01T00:00:00.000Z'),
          }),
          toArray()
        )
      );

      const roundComplete = events.find(isRoundCompleteEvent);
      const attachmentEvents = roundComplete!.data.attachment_events!;
      expect(attachmentEvents).toHaveLength(2);

      expect(attachmentEvents[0]).toMatchObject({
        type: TimelineEventType.attachmentAdded,
        execution_id: 'round-1::execution',
        actor: { type: EventActorType.user, id: 'profile-1', username: 'jane' },
        data: {
          attachment_id: 'user-sent',
          attachment_type: 'text',
          current_version: 1,
          render_inline: false,
          source: 'chat_input',
        },
      });
      expect(attachmentEvents[1]).toMatchObject({
        type: TimelineEventType.attachmentAdded,
        execution_id: 'round-1::execution',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        data: {
          attachment_id: 'tool-made',
          attachment_type: 'text',
          current_version: 1,
          render_inline: false,
          source: 'execution',
        },
      });
      // uuid ids, never round-derived
      expect(attachmentEvents[0].id).not.toContain('::');
      // the log was drained by the operator
      expect(attachmentStateManager.drainChanges()).toEqual([]);
    });

    it('uses an external actor for chat_input events when the round has an origin', async () => {
      const attachmentStateManager = createAttachmentStateManager([], typeDefs);
      const events = await firstValueFrom(
        completedRunEvents().pipe(
          addRoundCompleteEvent({
            ...createDeps(),
            attachmentStateManager,
            chatInputChanges: [
              {
                kind: 'added',
                attachment_id: 'slack-file',
                attachment_type: 'text',
                current_version: 1,
              },
            ],
            agentId: 'agent-1',
            roundId: 'round-1',
            userInput: { message: 'from slack' },
            origin: {
              type: ConversationOriginType.Slack,
              external_conversation_id: 'team:T123/channel:C123/thread:1',
              author: { id: 'U123', username: 'jane' },
            },
            author: { id: 'U123', username: 'jane' },
            startTime: new Date('2026-01-01T00:00:00.000Z'),
          }),
          toArray()
        )
      );

      const [event] = events.find(isRoundCompleteEvent)!.data.attachment_events!;
      expect(event.actor).toEqual({
        type: EventActorType.external,
        id: 'U123',
        username: 'jane',
        origin: { type: ConversationOriginType.Slack },
      });
    });

    it('omits attachment_events when nothing changed', async () => {
      const attachmentStateManager = createAttachmentStateManager([], typeDefs);
      const events = await firstValueFrom(
        completedRunEvents().pipe(
          addRoundCompleteEvent({
            ...createDeps(),
            attachmentStateManager,
            chatInputChanges: [],
            agentId: 'agent-1',
            userInput: { message: 'hi' },
            startTime: new Date('2026-01-01T00:00:00.000Z'),
          }),
          toArray()
        )
      );

      expect(events.find(isRoundCompleteEvent)!.data.attachment_events).toBeUndefined();
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
      of(finalState(freshTracker()), messageCompleteEvent as ConvertedEvents).pipe(
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
      of(finalState(freshTracker()), messageCompleteEvent as ConvertedEvents).pipe(
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
    const { pendingTurn, tracker } = pendingTurnFor(pendingRound);

    const events = await firstValueFrom(
      of(finalState(tracker), messageComplete()).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingTurn,
          tracker,
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
    const { pendingTurn, tracker } = pendingTurnFor(pendingRound);

    const resolved = { tool_result_id: 'res-1', type: ToolResultType.other, data: 'resolved' };
    // What `executeTool` emits for the re-run call: its result and the progress observed since.
    tracker.apply([
      stepUpdates.resolveToolCall({
        toolCallId: 'call-1',
        toolId: 'my_tool',
        results: [resolved],
        progression: [{ message: 'Resumed' }],
      }),
      stepUpdates.append({ type: ConversationRoundStepType.reasoning, reasoning: 'done' }),
    ]);

    const events = await firstValueFrom(
      of(
        finalState(tracker, { currentCycle: 1 }),
        {
          type: ChatEventType.toolResult,
          data: { tool_call_id: 'call-1', tool_id: 'my_tool', results: [resolved] },
        } as ConvertedEvents,
        messageComplete('deleted')
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingTurn,
          tracker,
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
      of(finalState(freshTracker()), messageCompleteEvent as ConvertedEvents).pipe(
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

  const typeDefStub = {
    getTypeDefinition: (type: string) => ({
      id: type,
      validate: (input: unknown) => ({ valid: true as const, data: input }),
      format: () => ({ getRepresentation: () => ({ type: 'text' as const, value: '' }) }),
    }),
  };
  it('retains new attachment context after resume, save and reload', async () => {
    const attachmentStateManager = createAttachmentStateManager([], typeDefStub);
    await attachmentStateManager.add(
      { id: 'original', type: 'text', data: { content: 'first' }, description: 'Original note' },
      'user'
    );
    const pendingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [confirmPrompt],
      input: {
        message: 'Read the notes',
        attachment_refs: attachmentStateManager.getAccessedRefs(),
        attachment_context: 'Original attachment metadata',
      },
    });
    const { pendingTurn, tracker } = pendingTurnFor(pendingRound);
    attachmentStateManager.clearAccessTracking();
    await attachmentStateManager.add(
      { id: 'new', type: 'text', data: { content: 'second' }, description: 'New note' },
      'user'
    );
    const events = await firstValueFrom(
      of(finalState(tracker, { currentCycle: 1 }), messageComplete('Read both notes')).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          pendingTurn,
          tracker,
          userInput: { message: 'Read this too' },
          startTime: new Date('2026-01-01T00:05:00.000Z'),
        }),
        toArray()
      )
    );
    const completed = events.find(isRoundCompleteEvent);
    if (!completed?.data.resume_execution) {
      throw new Error('Expected resume execution');
    }
    const followUpRound = completed.data.resume_execution.follow_up_round;
    const conversation = createEmptyConversation({ schema_version: CONVERSATION_SCHEMA_VERSION });
    const initialEvents = roundToEvents(pendingRound, conversation);
    const response = promptResponseEvent({
      roundId: pendingRound.id,
      executionIndex: 1,
      promptRequestedEventId: `${pendingRound.id}::execution_terminated`,
      responses: {},
      input: followUpRound.input,
      conversation,
      createdAt: followUpRound.started_at,
    });
    const timeline = [
      ...initialEvents,
      response,
      ...resumeExecutionToEvents({
        followUpRound,
        roundId: pendingRound.id,
        executionIndex: 1,
        triggerEventId: response.id,
        conversation,
      }),
    ];
    const saved = toEs({ ...conversation, events: timeline, rounds: [] }, 'default');
    const loaded = fromEs(
      { _id: conversation.id, _seq_no: 1, _primary_term: 1, _source: saved },
      { id: 'unknown', username: 'unknown', isAdmin: false }
    );
    const [reloadedRound] = eventsToRounds(loaded.events ?? []);
    expect(reloadedRound.input).toEqual(completed.data.round.input);
    expect(reloadedRound.input.attachment_refs?.map((ref) => ref.attachment_id)).toEqual([
      'original',
      'new',
    ]);
    expect(reloadedRound.input.attachment_context).toContain('attachment_id="original"');
    expect(reloadedRound.input.attachment_context).toContain('attachment_id="new"');
    expect(reloadedRound.input.attachment_context).toContain('description="New note"');
    expect(loaded.events?.slice(0, initialEvents.length)).toEqual(initialEvents);
    expect(pendingRound.input.attachment_context).toBe('Original attachment metadata');
  });

  it('persists attachment_refs and a rendered attachment_context for an attachment created this round', async () => {
    const attachmentStateManager = createAttachmentStateManager([], typeDefStub);
    // Mirrors what the attachment_add tool handler does mid-round.
    await attachmentStateManager.add(
      { id: 'a-1', type: 'text', data: { content: 'hi' }, description: 'A note' },
      'user'
    );
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'msg-1', message_content: 'done' },
    };

    const events = await firstValueFrom(
      of(finalState(freshTracker()), messageCompleteEvent as ConvertedEvents).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          userInput: { message: 'hello' },
          startTime: new Date(),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.input.attachment_refs).toEqual([
      { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' },
    ]);
    expect(roundCompleteEvent?.data.round.input.attachment_context).toContain(
      '<attachments count="1">'
    );
    expect(roundCompleteEvent?.data.round.input.attachment_context).toContain(
      'attachment_id="a-1"'
    );
    expect(roundCompleteEvent?.data.round.input.attachment_context).toContain(
      'description="A note"'
    );
  });

  it('persists an "updated" attachment_context for an attachment updated this round', async () => {
    const attachmentStateManager = createAttachmentStateManager(
      [
        {
          id: 'a-1',
          type: 'text',
          active: true,
          current_version: 1,
          versions: [
            {
              version: 1,
              data: { content: 'v1' },
              created_at: '2024-01-01T00:00:00.000Z',
              content_hash: 'hash-v1',
              estimated_tokens: 1,
            },
          ],
        },
      ],
      typeDefStub
    );
    await attachmentStateManager.update('a-1', { data: { content: 'v2' } }, 'user');
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'msg-1', message_content: 'done' },
    };

    const events = await firstValueFrom(
      of(finalState(freshTracker()), messageCompleteEvent as ConvertedEvents).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          userInput: { message: 'hello' },
          startTime: new Date(),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.input.attachment_refs).toEqual([
      { attachment_id: 'a-1', version: 2, operation: 'updated', actor: 'user' },
    ]);
    expect(roundCompleteEvent?.data.round.input.attachment_context).toContain(
      '<attachments count="1">'
    );
    expect(roundCompleteEvent?.data.round.input.attachment_context).toContain(
      'attachment_id="a-1"'
    );
  });

  it('does not set attachment_context when no attachments were created or updated this round', async () => {
    const attachmentStateManager = createAttachmentStateManager([], typeDefStub);
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'msg-1', message_content: 'done' },
    };

    const events = await firstValueFrom(
      of(finalState(freshTracker()), messageCompleteEvent as ConvertedEvents).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          userInput: { message: 'hello' },
          startTime: new Date(),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.input.attachment_refs).toBeUndefined();
    expect(roundCompleteEvent?.data.round.input.attachment_context).toBeUndefined();
  });

  it('only reports attachments touched this round, not ones created before clearAccessTracking()', async () => {
    const attachmentStateManager = createAttachmentStateManager([], typeDefStub);
    await attachmentStateManager.add(
      { id: 'earlier', type: 'text', data: { content: 'from a previous round' } },
      'user'
    );
    // Simulates prepare_conversation.ts's per-round reset of access tracking.
    attachmentStateManager.clearAccessTracking();
    await attachmentStateManager.add(
      { id: 'this-round', type: 'text', data: { content: 'now' } },
      'user'
    );
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'msg-1', message_content: 'done' },
    };

    const events = await firstValueFrom(
      of(finalState(freshTracker()), messageCompleteEvent as ConvertedEvents).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          userInput: { message: 'hello' },
          startTime: new Date(),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.input.attachment_refs).toEqual([
      { attachment_id: 'this-round', version: 1, operation: 'created', actor: 'user' },
    ]);
    expect(roundCompleteEvent?.data.round.input.attachment_context).toContain(
      'attachment_id="this-round"'
    );
    expect(roundCompleteEvent?.data.round.input.attachment_context).not.toContain('earlier');
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
    const tracker = freshTracker([createRelevantSkillsStep({ skills, source: 'implicit' })]);
    tracker.apply([
      stepUpdates.append({ type: ConversationRoundStepType.reasoning, reasoning: 'thinking' }),
    ]);

    const events = await firstValueFrom(
      completedRunEvents(tracker).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          tracker,
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

  it('drops runtime-only tool calls and keeps the todos step, converging with the final graph state', async () => {
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
    const tracker = freshTracker();
    tracker.apply(updates);
    const graphSteps = applyStepUpdates([], updates);
    expect(tracker.getSteps()).toEqual(graphSteps);

    const logger = { warn: jest.fn() } as unknown as Logger;
    const events = await firstValueFrom(
      of(
        createFinalStateEvent({
          currentCycle: 1,
          errorCount: 0,
          steps: graphSteps,
          toolRenderState: {
            srv: { toolName: 'my_tool', kind: 'server' },
            brw: { toolName: 'browser_open_tab', kind: 'browser' },
          },
        } as unknown as StateType) as ConvertedEvents,
        messageComplete()
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          tracker,
          logger,
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
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns when the tracker diverged from the final graph state', async () => {
    const tracker = freshTracker();
    const logger = { warn: jest.fn() } as unknown as Logger;
    await firstValueFrom(
      of(
        createFinalStateEvent({
          currentCycle: 0,
          errorCount: 0,
          steps: [{ type: ConversationRoundStepType.reasoning, reasoning: 'unseen' }],
          toolRenderState: {},
        } as StateType) as ConvertedEvents,
        messageComplete()
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          tracker,
          logger,
          userInput: { message: 'go' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('diverged'));
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
    const tracker = new RunStepTracker({ graphName: 'g' });
    tracker.seed(pendingTurn.steps, { execution: 'resume', pendingToolCallIds: [] });
    tracker.apply([
      stepUpdates.append({ type: ConversationRoundStepType.reasoning, reasoning: 'r2' }),
    ]);

    // exec 2: the second resume, adding an attachment ref, usage and configuration overrides.
    const startTime = new Date('2026-01-01T00:02:00.000Z');
    const events = await firstValueFrom(
      of(finalState(tracker, { currentCycle: 2 }), messageComplete('final')).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingTurn,
          tracker,
          attachmentStateManager: {
            getAccessedRefs: jest.fn(() => [{ attachment_id: 'a3', version: 1 }]),
            getAll: jest.fn(() => []),
            drainChanges: jest.fn(() => []),
            getAttachmentRecord: jest.fn(() => undefined),
          } as unknown as AttachmentStateManager,
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
          { attachment_id: 'a3', version: 1 },
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
      input: { message: 'continue-2', attachment_refs: [{ attachment_id: 'a3', version: 1 }] },
    });
  });
});
