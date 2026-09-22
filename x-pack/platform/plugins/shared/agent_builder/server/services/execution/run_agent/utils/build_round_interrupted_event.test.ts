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
  EventActorType,
} from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
import type { ConvertedEvents } from '../convert_graph_events';
import { buildRoundInterruptedEvent } from './build_round_interrupted_event';

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

  const toolCall = {
    type: ChatEventType.toolCall,
    data: { tool_call_id: 'c1', tool_id: 'my_tool', params: {} },
  } as ConvertedEvents;

  const base = (overrides: Partial<Parameters<typeof buildRoundInterruptedEvent>[0]> = {}) =>
    buildRoundInterruptedEvent({
      events: [toolCall],
      roundId: 'r1',
      pendingRound: undefined,
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

  it('builds the interrupted round from the collected events with the partial summary', () => {
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

  it('on a resume, uses the pending round identity and flags the event as resumed', () => {
    const pendingRound = createRound({
      id: 'pending-1',
      status: ConversationRoundStatus.awaitingPrompt,
      author: { id: 'u-pending', username: 'pending' },
    });
    const change = {
      kind: 'added',
      attachment_id: 'a1',
      attachment_type: 'text',
      current_version: 1,
    };
    const event = base({
      pendingRound,
      author: { id: 'u-new', username: 'new' },
      chatInputChanges: [change as never],
    });

    expect(event.data.resumed).toBe(true);
    // the runner's round id is announced; the identity for attachment events is the pending round's
    expect(event.data.round_id).toBe('r1');
    const [attachmentEvent] = event.data.attachment_events!;
    expect(attachmentEvent.execution_id).toBe('pending-1::execution');
    expect(attachmentEvent.actor).toMatchObject({ id: 'u-pending' });
  });

  it('includes the workspace id when the run had one', () => {
    expect(base({ getWorkspaceId: () => 'ws-1' }).data.workspace_id).toBe('ws-1');
    expect(base({ getWorkspaceId: () => undefined }).data).not.toHaveProperty('workspace_id');
  });
});
