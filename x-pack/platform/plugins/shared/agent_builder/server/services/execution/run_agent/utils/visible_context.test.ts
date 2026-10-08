/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, lastValueFrom, of, toArray } from 'rxjs';
import type { BaseMessage } from '@langchain/core/messages';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  ChatAgentEvent,
  CompactionCursor,
  CompactionSummary,
  Conversation,
  ConversationRoundStep,
  ConverseInput,
  RoundCompleteEvent,
  TimelineEvent,
  ToolCallStep,
  ToolResult,
} from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  ChatEventType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  TimelineEventType,
  ToolResultType,
  createPreExecutionWorkflowStep,
  createSubstitutionStep,
  isEventsNativeVersion,
  isRoundCompleteEvent,
  roundUserMessageEventId,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type {
  ConversationStateManager,
  ModelProvider,
  ToolResultStore,
} from '@kbn/agent-builder-server/runner';
import {
  T0,
  attachmentEventFixture,
  pausedRoundTimeline,
  processedCustomEventFixture,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import {
  createConversationClientMock,
  createEmptyConversation,
  createRound,
} from '../../../../test_utils/conversations';
import { createAgentHandlerContextMock } from '../../../../test_utils/runner';
import { createRootStateChunkEvent } from '../../../../test_utils/graph_stream';
import { roundsToEvents, userMessageActor } from '../../../conversation/client/rounds_to_events';
import { sourceEvents } from '../../../conversation/client/source_events';
import {
  appendResumeExecution$,
  appendRoundTerminated$,
  persistUserMessage,
  type ConversationWithOperation,
} from '../../utils/conversations';
import { eventsForContext, type ProcessedTimelineEvent } from './context_timeline';
import { prepareConversation, type ProcessedConversation } from './prepare_conversation';
import type { CurrentRun, ToolRenderStateMap } from '../transient_state';
import { listVisibleUnits } from './context_coverage';
import {
  RunAttachmentEvents,
  inheritedAttachmentEvents,
  runTriggerEventId,
} from '../run_attachment_events';
import { RunTracker } from '../run_tracker';
import { applyStepUpdates, stepUpdates } from '../step_state';
import { addRoundCompleteEvent } from './add_round_complete_event';
import { buildResumeAnchors, pausedItems } from './attachment_placement';
import { getPendingTurn, type PendingTurn } from './conversation_turn';
import {
  buildContextView,
  renderUnit,
  renderVisibleContext,
  type VisibleContextDeps,
} from './visible_context';

const deps = (): VisibleContextDeps => ({
  resultStore: {
    getEntryByResultId: jest.fn(async (id: string) => ({
      path: `/x/${id}.json`,
      metadata: { token_count: 9000 },
    })),
  } as unknown as ToolResultStore,
  resultTransformer: async (toolCall) => toolCall.results,
  logger: loggerMock.create(),
});

const conversation = (timeline: ProcessedTimelineEvent[]): ProcessedConversation => ({
  timeline,
  nextInput: { message: 'NEXT_INPUT', attachments: [] },
  attachmentTypes: [],
  attachmentStateManager: {} as ProcessedConversation['attachmentStateManager'],
});

const rawResults = (id: string): ToolResult[] => [
  { type: ToolResultType.other, tool_result_id: `${id}-r`, data: { big: `RAW_${id}` } },
];

const call = (id: string): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'platform.tool',
  tool_call_group_id: `g-${id}`,
  params: {},
  results: rawResults(id),
  progression: [],
});

const renderStateOf = (ids: string[]): ToolRenderStateMap =>
  Object.fromEntries(
    ids.map((id, index) => [
      id,
      {
        toolName: 'platform_tool',
        kind: 'server' as const,
        cycle: index + 1,
        content: JSON.stringify({ results: rawResults(id) }),
      },
    ])
  );

const run = (
  steps: ConversationRoundStep[],
  { cursor, renderState = {} }: { cursor?: CompactionCursor; renderState?: ToolRenderStateMap } = {}
): CurrentRun => ({
  roundId: 'current',
  steps,
  cycleLimit: 30,
  renderState,
  pendingToolCallIds: [],
  retryNotices: [],
  ...(cursor ? { compactionSummary: summary(cursor) } : {}),
});

const summary = (cursor: CompactionCursor): CompactionSummary => ({
  summarized_up_to: cursor,
  summarized_round_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  token_count: 1,
  structured_data: {
    discussion_summary: 'SUMMARY_TEXT',
    user_intent: 'i',
    key_topics: [],
    entities: [],
    outcomes_and_decisions: [],
    unanswered_questions: [],
    agent_actions: [],
    tool_calls_summary: [],
  },
});

const text = (messages: BaseMessage[]) => JSON.stringify(messages.map((m) => m.content));

const twoRoundTimeline = () =>
  timelineFromRounds([
    {
      id: 'a',
      input: { message: 'FIRST_INPUT', attachments: [] },
      steps: [call('a1'), call('a2')],
      response: { message: 'FIRST_ANSWER' },
    },
    {
      id: 'b',
      input: { message: 'SECOND_INPUT', attachments: [] },
      steps: [call('b1')],
      response: { message: 'SECOND_ANSWER' },
    },
  ]);

describe('renderVisibleContext', () => {
  it('applies marks from a later-round substitution step to an earlier-round tool call', async () => {
    const timeline = timelineFromRounds([
      { id: 'a', input: { message: 'q', attachments: [] }, steps: [call('c1')] },
      {
        id: 'b',
        input: { message: 'q2', attachments: [] },
        steps: [
          createSubstitutionStep({
            substituted_tool_calls: [{ round_id: 'a', tool_call_id: 'c1' }],
            trigger: 'round_start',
            threshold_tokens: 1_000,
          }),
        ],
      },
    ]);

    const messages = await renderVisibleContext(
      { conversation: conversation(timeline), run: run([]), phase: 'research' },
      deps()
    );

    expect(text(messages)).not.toContain('RAW_c1');
    expect(text(messages)).toContain('/x/c1-r.json');
  });

  it('applies the current run substitution steps to its own results', async () => {
    const steps = [
      call('c1'),
      call('c2'),
      createSubstitutionStep({
        substituted_tool_calls: [{ round_id: 'current', tool_call_id: 'c2' }],
        trigger: 'intra_round',
        threshold_tokens: 1_000,
      }),
    ];
    const messages = await renderVisibleContext(
      {
        conversation: conversation([]),
        run: run(steps, { renderState: renderStateOf(['c1', 'c2']) }),
        phase: 'research',
      },
      deps()
    );

    expect(text(messages)).toContain('RAW_c1');
    expect(text(messages)).not.toContain('RAW_c2');
    expect(text(messages)).toContain('/x/c2-r.json');
  });

  it('renders the summary, then the rest of a partially covered round with its user message', async () => {
    const messages = await renderVisibleContext(
      {
        conversation: conversation(twoRoundTimeline()),
        run: run([], { cursor: { round_id: 'a', tool_call_id: 'a1' } }),
        phase: 'research',
      },
      deps()
    );
    const rendered = text(messages);

    expect(rendered.indexOf('SUMMARY_TEXT')).toBeLessThan(rendered.indexOf('FIRST_INPUT'));
    expect(rendered).not.toContain('RAW_a1');
    expect(rendered).toContain('RAW_a2');
    expect(rendered).toContain('FIRST_ANSWER');
    expect(rendered).toContain('SECOND_INPUT');
    expect(rendered).toContain('NEXT_INPUT');
  });

  it('hides the history and the current cycles covered by a current-run cursor', async () => {
    const steps = [call('x1'), call('x2')];
    const messages = await renderVisibleContext(
      {
        conversation: conversation(twoRoundTimeline()),
        run: run(steps, {
          cursor: { round_id: 'current', tool_call_id: 'x1' },
          renderState: renderStateOf(['x1', 'x2']),
        }),
        phase: 'research',
      },
      deps()
    );
    const rendered = text(messages);

    expect(rendered).toContain('SUMMARY_TEXT');
    expect(rendered).not.toContain('FIRST_INPUT');
    expect(rendered).not.toContain('SECOND_ANSWER');
    expect(rendered).not.toContain('RAW_x1');
    expect(rendered).toContain('RAW_x2');
    // the current input is never covered
    expect(rendered).toContain('NEXT_INPUT');
  });

  it('keeps the workflow model context of the current run after the request once covered', async () => {
    const render = (cursor?: CompactionCursor) =>
      renderVisibleContext(
        {
          conversation: conversation(twoRoundTimeline()),
          run: run(
            [
              createPreExecutionWorkflowStep({ model_context: 'WF_CONTEXT' }),
              call('x1'),
              call('x2'),
            ],
            { cursor, renderState: renderStateOf(['x1', 'x2']) }
          ),
          phase: 'research',
        },
        deps()
      );

    for (const cursor of [undefined, { round_id: 'current', tool_call_id: 'x1' }]) {
      const rendered = text(await render(cursor));
      expect(rendered.split('WF_CONTEXT')).toHaveLength(2);
      expect(rendered.indexOf('WF_CONTEXT')).toBeGreaterThan(rendered.indexOf('NEXT_INPUT'));
      expect(rendered.indexOf('WF_CONTEXT')).toBeLessThan(rendered.indexOf('RAW_x2'));
      expect(rendered.includes('RAW_x1')).toBe(cursor === undefined);
    }
  });

  it('renders the custom events after the cursor, and hides the ones it covers', async () => {
    const [roundA, roundB] = [
      { id: 'a', input: { message: 'FIRST_INPUT', attachments: [] }, steps: [call('a1')] },
      { id: 'b', input: { message: 'SECOND_INPUT', attachments: [] }, steps: [call('b1')] },
    ].map((round) => timelineFromRounds([round]));
    const note = (id: string) =>
      processedCustomEventFixture({
        id,
        created_at: new Date(0).toISOString(),
        representation: `${id.toUpperCase()}_TEXT`,
      });
    const messages = await renderVisibleContext(
      {
        conversation: conversation([...roundA, note('covered'), note('visible'), ...roundB]),
        run: run([], { cursor: { event_id: 'covered' } }),
        phase: 'research',
      },
      deps()
    );
    const rendered = text(messages);

    expect(rendered).not.toContain('FIRST_INPUT');
    expect(rendered).not.toContain('COVERED_TEXT');
    expect(rendered.indexOf('VISIBLE_TEXT')).toBeLessThan(rendered.indexOf('SECOND_INPUT'));
  });
});

describe('attachment events', () => {
  const inputEvent = attachmentEventFixture({
    id: 'in',
    source: 'chat_input',
    triggerEventId: 'r::user_message',
    executionId: 'r::execution',
    attachmentType: 'esql',
  });
  const toolEvent = attachmentEventFixture({
    id: 'tool',
    toolCallId: 'c1',
    executionId: 'r::execution',
    attachmentId: 'att-2',
    attachmentType: 'dashboard',
  });
  const describeAttachmentType = (type: string) => `${type} instructions`;

  const asProcessed = (events: TimelineEvent[]): ProcessedTimelineEvent[] =>
    events.map((event) =>
      event.id === 'r::user_message'
        ? {
            ...event,
            data: { message: 'hello r', attachments: [], attachment_events: [inputEvent] },
          }
        : event
    ) as ProcessedTimelineEvent[];

  const duringRun = () =>
    renderVisibleContext(
      {
        conversation: {
          ...conversation([]),
          nextInput: { message: 'Q', attachments: [], attachment_events: [inputEvent] },
          describeAttachmentType,
        },
        run: {
          ...run([call('c1')], { renderState: renderStateOf(['c1']) }),
          attachmentEvents: [toolEvent],
        },
        phase: 'research',
      },
      deps()
    );

  const nextTurn = () =>
    renderVisibleContext(
      {
        conversation: {
          ...conversation([
            // `prepareConversation` puts the linked input events on the processed user message
            ...timelineFromRounds([
              {
                id: 'r',
                input: { message: 'Q', attachments: [], attachment_events: [inputEvent] },
                steps: [call('c1')],
                response: { message: 'A' },
              },
            ]),
            inputEvent,
            toolEvent,
          ]),
          describeAttachmentType,
        },
        run: run([]),
        phase: 'research',
      },
      deps()
    );

  it('renders the round identically during the run and on the next turn', async () => {
    const current = await duringRun();
    const later = await nextTurn();
    expect(text(later.slice(0, current.length))).toEqual(text(current));
  });

  it('renders the paused round message with its input events during a resume, identically after the turn', async () => {
    const duringResume = await renderVisibleContext(
      {
        conversation: {
          ...conversation([...asProcessed(pausedRoundTimeline('r', ['c1'])), inputEvent]),
          describeAttachmentType,
          resumedRoundId: 'r',
        },
        // the resume is seeded with c1; the paused round's tool event arrives through the channel
        run: {
          ...run([call('c1'), call('c2')], { renderState: renderStateOf(['c1', 'c2']) }),
          attachmentEvents: [toolEvent],
        },
        phase: 'research',
      },
      deps()
    );
    const afterTurn = await renderVisibleContext(
      {
        conversation: {
          ...conversation([
            ...timelineFromRounds([
              {
                id: 'r',
                started_at: T0,
                input: { message: 'hello r', attachments: [], attachment_events: [inputEvent] },
                steps: [call('c1'), call('c2')],
                response: { message: 'A' },
              },
            ]),
            inputEvent,
            toolEvent,
          ]),
          describeAttachmentType,
        },
        run: run([]),
        phase: 'research',
      },
      deps()
    );

    expect(String(duringResume[0].content)).toContain(
      '<conversation_event type="attachment_added"'
    );
    expect(text(afterTurn.slice(0, duringResume.length))).toEqual(text(duringResume));
  });

  it('renders the input events of a resumed round once, with its user message', async () => {
    const timeline = [
      ...asProcessed(pausedRoundTimeline('r', ['c1'])),
      inputEvent,
      toolEvent,
    ] as ProcessedTimelineEvent[];
    const messages = await renderVisibleContext(
      {
        conversation: { ...conversation(timeline), describeAttachmentType, resumedRoundId: 'r' },
        run: {
          ...run([call('c1')], { renderState: renderStateOf(['c1']) }),
          attachmentEvents: inheritedAttachmentEvents(timeline, 'r'),
        },
        phase: 'research',
      },
      deps()
    );
    const rendered = text(messages);

    expect(rendered.match(/attachment_id=\\"att-1\\"/g)).toHaveLength(1);
    expect(String(messages[0].content)).toContain('attachment_id="att-1"');
    expect(rendered.match(/attachment_id=\\"att-2\\"/g)).toHaveLength(1);
  });

  it('puts input events inside the user message and tool events right after the tool results', async () => {
    const [userMessage, , toolResult, notice] = await duringRun();
    expect(String(userMessage.content)).toContain('<conversation_event type="attachment_added"');
    expect(String(userMessage.content)).toContain('esql instructions');
    expect(toolResult.getType()).toBe('tool');
    expect(String(notice.content)).toContain('attachment_id="att-2"');
    expect(String(notice.content)).toContain('dashboard instructions');
  });

  it('renders a change made outside a tool call after the outcome, from the next turn on', async () => {
    const hookEvent = attachmentEventFixture({
      id: 'hook',
      executionId: 'r::execution',
      attachmentId: 'att-3',
    });
    const during = await renderVisibleContext(
      {
        conversation: conversation([]),
        run: {
          ...run([call('c1')], { renderState: renderStateOf(['c1']) }),
          attachmentEvents: [hookEvent],
        },
        phase: 'research',
      },
      deps()
    );
    expect(text(during)).not.toContain('att-3');

    const later = await renderVisibleContext(
      {
        conversation: conversation([
          ...timelineFromRounds([
            {
              id: 'r',
              input: { message: 'Q', attachments: [] },
              steps: [call('c1')],
              response: { message: 'A' },
            },
          ]),
          hookEvent,
        ]),
        run: run([]),
        phase: 'research',
      },
      deps()
    );
    const answerIndex = later.findIndex((m) => m.content === 'A');
    expect(String(later[answerIndex + 1].content)).toContain('att-3');
  });

  it('renders resume input after the paused call, identically during the resume and on the next turn', async () => {
    const resumeInput = attachmentEventFixture({
      id: 'resume-in',
      source: 'chat_input',
      triggerEventId: 'r::prompt_response::1',
      executionId: 'r::execution::1',
      attachmentId: 'att-9',
    });
    const resumeAnchors = new Map([
      ['r::prompt_response::1', [{ type: 'tool_call' as const, tool_call_id: 'c1' }]],
    ]);

    const during = await renderVisibleContext(
      {
        conversation: {
          ...conversation([]),
          nextInput: { message: 'Q', attachments: [] },
          resumeAnchors,
        },
        run: {
          ...run([call('c1'), call('c2')], { renderState: renderStateOf(['c1', 'c2']) }),
          attachmentEvents: [resumeInput],
        },
        phase: 'research',
      },
      deps()
    );
    const later = await renderVisibleContext(
      {
        conversation: {
          ...conversation([
            ...timelineFromRounds([
              {
                id: 'r',
                input: { message: 'Q', attachments: [] },
                steps: [call('c1'), call('c2')],
                response: { message: 'A' },
              },
            ]),
            { ...resumeInput, execution_id: 'r::execution' },
          ]),
          resumeAnchors,
        },
        run: run([]),
        phase: 'research',
      },
      deps()
    );

    expect(text(later.slice(0, during.length))).toEqual(text(during));
    const noticeIndex = during.findIndex((m) => String(m.content).includes('att-9'));
    expect(during[noticeIndex - 1].getType()).toBe('tool');
    expect(during[noticeIndex + 1].getType()).toBe('ai');
  });

  it('renders a cycle notice in its round_cycle unit, so the summarizer and estimates see it', async () => {
    const history = conversation([
      ...timelineFromRounds([
        {
          id: 'r',
          input: { message: 'Q', attachments: [] },
          steps: [call('c1')],
          response: { message: 'A' },
        },
      ]),
      toolEvent,
    ]);
    const view = buildContextView({ conversation: history, run: run([]) }, deps());
    const units = listVisibleUnits({
      entries: view.history.entries,
      steps: [],
      visibility: view.visibility,
    });
    const rendered = await renderUnit(units[0], { view, run: run([]), conversation: history });
    expect(text(rendered)).toContain('att-2');
    expect(text(rendered)).not.toContain('ATTACHMENT TYPES');
  });
});

describe('renderUnit', () => {
  it('renders round cycles with their user message first and their outcome last', async () => {
    const convo = conversation(twoRoundTimeline());
    const currentRun = run([call('x1')], { renderState: renderStateOf(['x1']) });
    const view = buildContextView({ conversation: convo, run: currentRun }, deps());
    const units = listVisibleUnits({
      entries: view.history.entries,
      steps: currentRun.steps,
      visibility: view.visibility,
    });

    const rendered = await Promise.all(
      units.map(async (unit) =>
        text(await renderUnit(unit, { view, run: currentRun, conversation: convo }))
      )
    );

    expect(rendered).toHaveLength(4);
    expect(rendered[0]).toContain('FIRST_INPUT');
    expect(rendered[0]).toContain('RAW_a1');
    expect(rendered[0]).not.toContain('FIRST_ANSWER');
    expect(rendered[1]).not.toContain('FIRST_INPUT');
    expect(rendered[1]).toContain('RAW_a2');
    expect(rendered[1]).toContain('FIRST_ANSWER');
    expect(rendered[2]).toContain('SECOND_INPUT');
    expect(rendered[2]).toContain('SECOND_ANSWER');
    expect(rendered[3]).toContain('RAW_x1');
  });
});

describe('prompt-cache stability through persistence and reload', () => {
  const author = { id: 'user-1', username: 'alice' };
  const agentId = 'agent-1';

  /** The handler context of one run: a real attachment state manager over the stored attachments. */
  const handlerContext = (attachments: VersionedAttachment[] = []) => {
    const context = createAgentHandlerContextMock();
    context.attachments.getTypeDefinition.mockImplementation((type) => ({
      id: type,
      validate: jest.fn(),
      format: jest.fn(),
      getAgentDescription: () => `${type} instructions`,
    }));
    context.attachmentStateManager = createAttachmentStateManager(attachments, {
      getTypeDefinition: (type: string) => ({
        id: type,
        validate: (input: unknown) => ({ valid: true, data: input }),
        format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
      }),
    });
    return context;
  };

  /**
   * A stored conversation behind the conversation client: a legacy document reads with its events
   * derived from its rounds, and `appendEvents` / `replaceRoundEvents` apply as the client does.
   */
  const conversationStore = (initial: Conversation) => {
    let stored = initial;
    const read = (): ConversationWithOperation => ({
      ...stored,
      events:
        isEventsNativeVersion(stored.schema_version) && stored.events?.length
          ? stored.events
          : roundsToEvents(stored),
      operation: 'UPDATE',
    });
    const write = (
      events: NonNullable<Conversation['events']>,
      attachments?: { produced: VersionedAttachment[] }
    ): Conversation => {
      stored = {
        ...stored,
        schema_version: CONVERSATION_SCHEMA_VERSION,
        events,
        ...(attachments ? { attachments: attachments.produced } : {}),
      };
      return stored;
    };
    const client = createConversationClientMock();
    client.appendEvents.mockImplementation(async ({ events, attachments }) => {
      const current = read().events ?? [];
      const ids = new Set(current.map(({ id }) => id));
      return write([...current, ...events.filter(({ id }) => !ids.has(id))], attachments);
    });
    client.replaceRoundEvents.mockImplementation(async ({ roundId, events, attachments }) => {
      const current = read().events ?? [];
      const isRoundEvent = ({ id }: { id: string }) => id.startsWith(`${roundId}::`);
      const others = current.filter((event) => !isRoundEvent(event));
      const otherIds = new Set(others.map(({ id }) => id));
      const firstRoundIndex = current.findIndex(isRoundEvent);
      const insertAt = firstRoundIndex === -1 ? others.length : firstRoundIndex;
      return write(
        [
          ...others.slice(0, insertAt),
          ...events.filter(({ id }) => !otherIds.has(id)),
          ...others.slice(insertAt),
        ],
        attachments
      );
    });
    return { client, read };
  };

  const toolCallIds = (steps: ConversationRoundStep[]) =>
    steps.flatMap((step) =>
      step.type === ConversationRoundStepType.toolCall ? [step.tool_call_id] : []
    );

  const currentRun = (
    roundId: string,
    steps: ConversationRoundStep[],
    attachmentEvents: CurrentRun['attachmentEvents'] = []
  ): CurrentRun => ({
    ...run(steps, { renderState: renderStateOf(toolCallIds(steps)) }),
    roundId,
    attachmentEvents,
  });

  /** What a provider caches on: each message's role, content and tool call links. */
  const serialized = (messages: BaseMessage[]) =>
    JSON.stringify(
      messages.map((message) => ({
        type: message.getType(),
        content: message.content,
        toolCalls: 'tool_calls' in message ? message.tool_calls : undefined,
        toolCallId: 'tool_call_id' in message ? message.tool_call_id : undefined,
      }))
    );

  /** The `round_complete` event the run emits once the graph stream ends on `steps`. */
  const completeRound = async ({
    tracker,
    steps,
    pendingTurn,
    roundId,
    message,
    startTime,
    context,
    runAttachmentEvents,
  }: {
    tracker: RunTracker;
    steps: ConversationRoundStep[];
    pendingTurn?: PendingTurn;
    roundId: string;
    message: string;
    startTime: Date;
    context: ReturnType<typeof handlerContext>;
    runAttachmentEvents: RunAttachmentEvents;
  }): Promise<RoundCompleteEvent> => {
    tracker.observeGraphEvent(
      createRootStateChunkEvent('g', {
        steps,
        toolRenderState: renderStateOf(toolCallIds(steps)),
      })
    );
    const answer = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'm', message_content: 'ANSWER' },
    } as ChatAgentEvent;
    const events = await firstValueFrom(
      of(answer).pipe(
        addRoundCompleteEvent({
          pendingTurn,
          tracker,
          userInput: { message },
          author,
          startTime,
          endTime: new Date(startTime.getTime() + 1_000),
          getConversationState: () => ({}),
          modelProvider: { getUsageStats: () => ({ calls: [] }) } as unknown as ModelProvider,
          mainConnectorId: 'connector',
          stateManager: {} as unknown as ConversationStateManager,
          attachmentStateManager: context.attachmentStateManager,
          roundId,
          runAttachmentEvents,
        }),
        toArray()
      )
    );
    const roundComplete = events.find(isRoundCompleteEvent);
    if (!roundComplete) {
      throw new Error('expected a round_complete event');
    }
    return roundComplete;
  };

  /** The next turn's context: the stored conversation reloaded and prepared as a run does. */
  const renderNextTurn = async (reloaded: Conversation) =>
    renderVisibleContext(
      {
        conversation: await prepareConversation({
          timeline: eventsForContext(reloaded),
          nextInput: { message: 'NEXT' },
          nextInputAuthor: author,
          context: handlerContext(reloaded.attachments),
          resumeAnchors: buildResumeAnchors(sourceEvents(reloaded)),
        }),
        run: currentRun('next-round', []),
        phase: 'research',
        conversationTimestamp: new Date().toISOString(),
      },
      deps()
    );

  it('renders a round with input and parallel tool attachment events identically once persisted and reloaded', async () => {
    const startTime = new Date();
    const roundId = 'r1';
    const store = conversationStore(
      createEmptyConversation({
        id: 'conversation-1',
        agent_id: agentId,
        user: author,
        schema_version: CONVERSATION_SCHEMA_VERSION,
        events: [],
      })
    );
    const nextInput: ConverseInput = {
      message: 'Q',
      attachments: [
        { id: 'in-1', type: 'text', data: 'first input' },
        { id: 'in-2', type: 'esql', data: 'FROM logs' },
      ],
    };

    // the message is stored on receipt, before the run reads the conversation
    await persistUserMessage({
      conversation: store.read(),
      conversationClient: store.client,
      eventId: roundUserMessageEventId(roundId),
      receivedAt: startTime,
      input: nextInput,
      author,
    });
    const received = store.read();

    const context = handlerContext(received.attachments);
    const processed = await prepareConversation({
      timeline: eventsForContext(received),
      nextInput,
      nextInputAuthor: author,
      context,
      resumeAnchors: buildResumeAnchors(sourceEvents(received)),
    });
    const runAttachmentEvents = new RunAttachmentEvents({
      attachmentStateManager: context.attachmentStateManager,
      roundId,
      triggerEventId: runTriggerEventId({ conversation: received, roundId }),
      inputActor: userMessageActor(received, { author }),
      agentId,
    });
    const chatInputEvents = runAttachmentEvents.drainChatInput();
    processed.nextInput = { ...processed.nextInput, attachment_events: chatInputEvents };

    // one tool batch of two parallel calls, each changing an attachment
    const steps = [call('c1'), call('c2')].map((step) => ({
      ...step,
      tool_call_group_id: 'batch',
    }));
    await context.attachmentStateManager
      .forToolCall('c1')
      .add({ id: 'tool-1', type: 'dashboard', data: { panels: [] } });
    await context.attachmentStateManager
      .forToolCall('c2')
      .add({ id: 'tool-2', type: 'text', data: 'note' });
    const toolEvents = runAttachmentEvents.drainToolCalls(['c1', 'c2']);

    const during = await renderVisibleContext(
      {
        conversation: processed,
        run: currentRun(roundId, steps, toolEvents),
        phase: 'research',
        conversationTimestamp: startTime.toISOString(),
      },
      deps()
    );

    const roundComplete = await completeRound({
      tracker: new RunTracker({ graphName: 'g' }),
      steps,
      roundId,
      message: processed.nextInput.message,
      startTime,
      context,
      runAttachmentEvents,
    });
    await lastValueFrom(
      appendRoundTerminated$({
        conversation: received,
        conversationClient: store.client,
        roundCompletedEvents$: of(roundComplete),
      })
    );
    const later = await renderNextTurn(store.read());

    expect(chatInputEvents).toHaveLength(2);
    expect(toolEvents).toHaveLength(2);
    expect(String(during[0].content).match(/type="attachment_added"/g)).toHaveLength(2);
    const notice = String(during[during.length - 1].content);
    expect(notice).toContain('attachment_id="tool-1"');
    expect(notice).toContain('attachment_id="tool-2"');
    expect(during[during.length - 2].getType()).toBe('tool');
    expect(later.length).toBeGreaterThan(during.length);
    expect(serialized(later.slice(0, during.length))).toEqual(serialized(during));
  });

  it("renders a legacy paused round's resume input after the paused call, identically once the resume is persisted", async () => {
    const pausedCall: ToolCallStep = { ...call('c1'), results: [] };
    const store = conversationStore(
      createEmptyConversation({
        id: 'conversation-1',
        agent_id: agentId,
        user: author,
        rounds: [
          createRound({
            id: 'r',
            status: ConversationRoundStatus.awaitingPrompt,
            input: { message: 'Q' },
            steps: [pausedCall],
            pending_prompts: [{ id: 'confirm', type: AgentPromptType.confirmation }],
            state: {
              version: 2,
              agent: {
                current_cycle: 1,
                error_count: 0,
                nodes: [
                  {
                    step: 'execute_tool',
                    tool_call_id: 'c1',
                    tool_id: pausedCall.tool_id,
                    tool_params: {},
                    tool_state: undefined,
                  },
                ],
              },
            },
            started_at: T0,
          }),
        ],
      })
    );
    const paused = store.read();
    expect(isEventsNativeVersion(paused.schema_version)).toBe(false);
    const pendingTurn = getPendingTurn(paused);
    if (!pendingTurn?.terminated) {
      throw new Error('expected a paused turn');
    }
    const { compatRound } = pendingTurn;

    const triggerEventId = runTriggerEventId({
      conversation: paused,
      pendingTurnId: pendingTurn.id,
      roundId: 'resume-run',
    });
    const resumeAnchors = buildResumeAnchors(sourceEvents(paused));
    resumeAnchors.set(triggerEventId, pausedItems(pendingTurn.terminated));
    const resumeInput: ConverseInput = {
      message: '',
      prompts: { confirm: { allow: true } },
      attachments: [{ id: 'resume-in', type: 'text', data: 'sent with the answer' }],
    };

    const context = handlerContext(paused.attachments);
    const processed = await prepareConversation({
      timeline: eventsForContext(paused),
      nextInput: resumeInput,
      nextInputAuthor: compatRound.author,
      context,
      resumeAnchors,
    });
    processed.resumedRoundId = pendingTurn.id;
    const runAttachmentEvents = new RunAttachmentEvents({
      attachmentStateManager: context.attachmentStateManager,
      roundId: pendingTurn.id,
      triggerEventId,
      inputActor: userMessageActor(paused, {
        author: compatRound.author,
        origin: compatRound.origin,
      }),
      agentId,
    });
    const chatInputEvents = runAttachmentEvents.drainChatInput();

    const tracker = new RunTracker({ graphName: 'g' });
    tracker.seed({
      steps: pendingTurn.steps,
      inherited: { steps: pendingTurn.steps, pendingToolCallIds: ['c1'] },
    });
    const steps = applyStepUpdates(pendingTurn.steps, [
      stepUpdates.resolveToolCall({
        toolCallId: 'c1',
        toolId: pausedCall.tool_id,
        results: call('c1').results,
        progression: [],
      }),
      stepUpdates.appendToolCall(call('c2')),
    ]);

    const during = await renderVisibleContext(
      {
        conversation: processed,
        run: currentRun(pendingTurn.id, steps, [
          ...inheritedAttachmentEvents(processed.timeline, pendingTurn.id),
          ...chatInputEvents,
        ]),
        phase: 'research',
        conversationTimestamp: compatRound.started_at,
      },
      deps()
    );

    const roundComplete = await completeRound({
      tracker,
      steps,
      pendingTurn,
      roundId: 'resume-run',
      message: processed.nextInput.message,
      startTime: new Date(),
      context,
      runAttachmentEvents,
    });
    await lastValueFrom(
      appendResumeExecution$({
        conversation: paused,
        conversationClient: store.client,
        roundCompletedEvents$: of(roundComplete),
        input: resumeInput,
        author,
      })
    );
    const reloaded = store.read();
    const later = await renderNextTurn(reloaded);

    expect(triggerEventId).toBe('r::prompt_response::1');
    expect(
      reloaded.events?.find((event) => event.type === TimelineEventType.promptResponse)
    ).toMatchObject({
      id: triggerEventId,
      data: { prompt_requested_event_id: 'r::execution_terminated' },
    });
    expect(buildResumeAnchors(sourceEvents(reloaded)).get(triggerEventId)).toEqual(
      resumeAnchors.get(triggerEventId)
    );
    const noticeIndex = during.findIndex((message) =>
      String(message.content).includes('attachment_id="resume-in"')
    );
    expect(noticeIndex).toBeGreaterThan(0);
    expect(during[noticeIndex - 1]).toEqual(expect.objectContaining({ tool_call_id: 'c1' }));
    expect(later.length).toBeGreaterThan(during.length);
    expect(serialized(later.slice(0, during.length))).toEqual(serialized(during));
  });
});
