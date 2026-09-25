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
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
import { createRootStateChunkEvent } from '../../../../test_utils/graph_stream';
import { RunTracker } from '../run_tracker';
import { buildRoundInterruptedEvent } from './build_round_interrupted_event';
import { getPendingTurn } from './conversation_turn';

jest.mock('../../../../tracing', () => ({
  getCurrentTraceId: () => 'trace-1',
}));

describe('buildRoundInterruptedEvent', () => {
  const startTime = new Date('2026-01-01T00:00:00.000Z');
  const endTime = new Date('2026-01-01T00:00:03.000Z');
  const ref = { attachment_id: 'a1', version: 1 };

  const attachmentStateManager = ({
    accessedRefs = [] as Array<typeof ref>,
    changes = [] as unknown[],
  } = {}) =>
    ({
      getAccessedRefs: jest.fn(() => accessedRefs),
      getAll: jest.fn(() => [{ id: 'a1' }]),
      drainChanges: jest.fn(() => changes),
      getAttachmentRecord: jest.fn(() => undefined),
    } as unknown as AttachmentStateManager);

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

  const base = (overrides: Partial<Parameters<typeof buildRoundInterruptedEvent>[0]> = {}) =>
    buildRoundInterruptedEvent({
      tracker: freshTracker(),
      roundId: 'r1',
      pendingTurn: undefined,
      startTime,
      endTime,
      processedInput: { message: 'hi', attachments: [] },
      agentId: 'agent-1',
      conversation: createEmptyConversation({ id: 'c1', agent_id: 'agent-1' }),
      modelProvider,
      mainConnectorId: 'connector-1',
      attachmentStateManager: attachmentStateManager(),
      chatInputChanges: [],
      ...overrides,
    });

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
      workflow_context: { semantic_memory: { recalled_ids: ['memory-1'] } },
    };
    tracker.seed({ steps: [workflowStep] });

    const event = base({ tracker });

    expect(event.data.steps).toEqual([workflowStep]);
  });

  it('merges refs accessed during the run into the input and renders the attachment context', () => {
    const event = base({ attachmentStateManager: attachmentStateManager({ accessedRefs: [ref] }) });

    expect(event.data.input.attachment_refs).toEqual([ref]);
    // no resolvable attachment record here, so no context is rendered and the field is left out
    expect(event.data.input).not.toHaveProperty('attachment_context');
  });

  it('stamps chat_input attachment events with the fresh round identity (author + origin)', () => {
    const change = {
      kind: 'added',
      attachment_id: 'a1',
      attachment_type: 'text',
      current_version: 1,
    };
    const event = base({
      author: { id: 'slack-U1', username: 'bob' },
      origin: { type: ConversationOriginType.Slack } as never,
      chatInputChanges: [change as never],
    });

    const [attachmentEvent] = event.data.attachment_events!;
    expect(attachmentEvent.execution_id).toBe('r1::execution');
    expect(attachmentEvent.actor).toMatchObject({
      type: EventActorType.external,
      id: 'slack-U1',
      origin: { type: ConversationOriginType.Slack },
    });
  });

  it('on a resume, uses the pending turn identity and flags the event as resumed', () => {
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

    const change = {
      kind: 'added',
      attachment_id: 'a1',
      attachment_type: 'text',
      current_version: 1,
    };
    const event = base({
      tracker,
      pendingTurn,
      conversation,
      author: { id: 'u-new', username: 'new' },
      chatInputChanges: [change as never],
    });

    expect(event.data.resumed).toBe(true);
    // the runner's round id is announced; the identity for attachment events is the pending turn's
    expect(event.data.round_id).toBe('r1');
    // the current execution's start, not the original user message's
    expect(event.data.started_at).toBe('2026-01-01T00:00:00.000Z');
    // the resume owns the paused call it was about to re-run (still unresolved), nothing else
    expect(event.data.steps).toEqual([
      expect.objectContaining({ tool_call_id: 'c1', results: [], progression: [] }),
    ]);
    const [attachmentEvent] = event.data.attachment_events!;
    expect(attachmentEvent.execution_id).toBe('pending-1::execution');
    expect(attachmentEvent.actor).toMatchObject({
      type: EventActorType.external,
      id: 'u-pending',
      origin: { type: ConversationOriginType.Slack },
    });
  });

  it('includes the workspace id when the run had one', () => {
    expect(base({ getWorkspaceId: () => 'ws-1' }).data.workspace_id).toBe('ws-1');
    expect(base({ getWorkspaceId: () => undefined }).data).not.toHaveProperty('workspace_id');
  });
});
