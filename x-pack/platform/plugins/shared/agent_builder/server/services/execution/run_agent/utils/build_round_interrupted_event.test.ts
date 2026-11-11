/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationOriginType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  type PreExecutionWorkflowStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type {
  AttachmentStateManager,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
import { createRootStateChunkEvent } from '../../../../test_utils/graph_stream';
import { RunAttachmentEvents } from '../run_attachment_events';
import { RunTracker } from '../run_tracker';
import {
  buildRoundInterruptedEvent,
  type BuildRoundInterruptedEventParams,
} from './build_round_interrupted_event';
import { getPendingTurn } from './conversation_turn';

const getTypeDefinition = (type: string) =>
  ({
    id: type,
    validate: (input: unknown) => ({ valid: true, data: input }),
    isReadonly: false,
  } as unknown as AttachmentTypeDefinition);

jest.mock('../../../../tracing', () => ({
  getCurrentTraceId: () => 'trace-1',
}));

describe('buildRoundInterruptedEvent', () => {
  const startTime = new Date('2026-01-01T00:00:00.000Z');
  const endTime = new Date('2026-01-01T00:00:03.000Z');
  const mockAttachmentStateManager = () =>
    ({
      getAll: jest.fn(() => [{ id: 'a1' }]),
      drainChanges: jest.fn(() => []),
    } as unknown as AttachmentStateManager);

  const runEventsOver = (attachmentStateManager: AttachmentStateManager) =>
    new RunAttachmentEvents({
      attachmentStateManager,
      roundId: 'r1',
      triggerEventId: 'r1::user_message',
      inputActor: { type: EventActorType.user, id: 'u1' },
      agentId: 'agent-1',
    });

  const modelProvider = { getUsageStats: () => ({ calls: [] }) } as unknown as ModelProvider;

  const toolCall: ToolCallStep = {
    type: ConversationRoundStepType.toolCall,
    tool_call_id: 'c1',
    tool_id: 'my_tool',
    params: {},
    results: [],
    progression: [],
  };

  /** A fresh run whose graph streamed one state: a single pending tool call. */
  const freshTracker = () => {
    const tracker = new RunTracker({ graphName: 'g' });
    tracker.seed({ steps: [] });
    tracker.observeGraphEvent(
      createRootStateChunkEvent('g', { steps: [toolCall], toolRenderState: {} })
    );
    return tracker;
  };

  const baseParams = (
    attachmentStateManager: AttachmentStateManager = mockAttachmentStateManager()
  ): BuildRoundInterruptedEventParams => ({
    tracker: freshTracker(),
    roundId: 'r1',
    pendingTurn: undefined,
    startTime,
    endTime,
    processedInput: { message: 'hi', attachments: [] },
    modelProvider,
    mainConnectorId: 'connector-1',
    attachmentStateManager,
    runAttachmentEvents: runEventsOver(attachmentStateManager),
  });

  const base = (overrides: Partial<BuildRoundInterruptedEventParams> = {}) =>
    buildRoundInterruptedEvent({ ...baseParams(), ...overrides });

  it('builds the interrupted round from the tracked steps with the partial summary', () => {
    const event = base();

    expect(event.type).toBe(ChatEventType.roundInterrupted);
    expect(event.data).toMatchObject({
      round_id: 'r1',
      started_at: '2026-01-01T00:00:00.000Z',
      input: { message: 'hi', attachments: [] },
      steps: [expect.objectContaining({ tool_call_id: 'c1', results: [] })],
      summary: { time_to_last_token: 3000, trace_id: 'trace-1' },
      attachments: [{ id: 'a1' }],
    });
    expect(event.data).not.toHaveProperty('resumed');
    expect(event.data).not.toHaveProperty('attachment_events');
  });

  it('persists a seeded pre-execution workflow step when the graph fails before streaming', () => {
    const tracker = new RunTracker({ graphName: 'g' });
    const workflowStep: PreExecutionWorkflowStep = {
      type: ConversationRoundStepType.preExecutionWorkflow,
      model_context: '<system_update>workflow context</system_update>',
      workflow_context: {
        'nightshift.semantic_memory.recall': { version: 1, data: { recalled_ids: ['memory-1'] } },
      },
    };
    tracker.seed({ steps: [workflowStep] });

    const event = base({ tracker });

    expect(event.data.steps).toEqual([workflowStep]);
  });

  it('persists the run attachment events, including changes of a batch that threw, and the received input', async () => {
    const attachmentStateManager = createAttachmentStateManager([], { getTypeDefinition });
    await attachmentStateManager.forToolCall('call-1').add({ id: 'a1', type: 'text', data: 'x' });
    const event = buildRoundInterruptedEvent({
      ...baseParams(attachmentStateManager),
      processedInput: { message: 'hi' },
    });
    expect(event.data.input).toEqual({ message: 'hi' });
    expect(event.data.attachment_events).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ tool_call_id: 'call-1' }) }),
    ]);
  });

  it('on a resume, flags the event as resumed and keeps the runner round id', () => {
    const pendingRound = createRound({
      id: 'pending-1',
      status: ConversationRoundStatus.awaitingPrompt,
      author: { id: 'u-pending', username: 'pending' },
      origin: { type: ConversationOriginType.Slack },
      started_at: '2025-12-31T23:00:00.000Z',
      pending_prompts: [{ id: 'p1', type: AgentPromptType.confirmation, title: 't', message: 'm' }],
      steps: [toolCall],
      state: {
        version: 2,
        agent: {
          current_cycle: 1,
          error_count: 0,
          nodes: [
            {
              step: 'execute_tool',
              tool_call_id: 'c1',
              tool_id: 'my_tool',
              tool_params: {},
              tool_state: undefined,
            },
          ],
        },
      },
    });
    const conversation = createEmptyConversation({ id: 'c1', rounds: [pendingRound] });
    const pendingTurn = getPendingTurn(conversation);
    if (!pendingTurn) {
      throw new Error('expected a pending turn');
    }
    // the resume failed before the graph streamed any state: the tracker falls back to the seed
    const tracker = new RunTracker({ graphName: 'g' });
    tracker.seed({
      steps: pendingTurn.steps,
      inherited: { steps: pendingTurn.steps, pendingToolCallIds: ['c1'] },
    });

    const event = base({ tracker, pendingTurn });

    expect(event.data.resumed).toBe(true);
    // the runner's round id is announced
    expect(event.data.round_id).toBe('r1');
    // the current execution's start, not the original user message's
    expect(event.data.started_at).toBe('2026-01-01T00:00:00.000Z');
    // the resume owns the paused call it was about to re-run (still unresolved), nothing else
    expect(event.data.steps).toEqual([
      expect.objectContaining({ tool_call_id: 'c1', results: [], progression: [] }),
    ]);
  });

  it('includes the workspace id when the run had one', () => {
    expect(base({ getWorkspaceId: () => 'ws-1' }).data.workspace_id).toBe('ws-1');
    expect(base({ getWorkspaceId: () => undefined }).data).not.toHaveProperty('workspace_id');
  });

  it('carries the compaction summary of the latest state, for persistence', () => {
    const compactionSummary = {
      summarized_up_to: { round_id: 'round-0', tool_call_id: 'c0' },
      summarized_round_count: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      token_count: 1,
      structured_data: {} as never,
    };
    const tracker = new RunTracker({ graphName: 'g' });
    tracker.seed({ steps: [] });
    tracker.observeGraphEvent(
      createRootStateChunkEvent('g', { steps: [toolCall], toolRenderState: {}, compactionSummary })
    );

    expect(base({ tracker }).data.compaction_summary).toEqual(compactionSummary);
    expect(base().data).not.toHaveProperty('compaction_summary');
  });
});
