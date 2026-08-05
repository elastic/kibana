/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, toArray } from 'rxjs';
import {
  ChatEventType,
  ConversationRoundStatus,
  ConversationOriginType,
  isRoundCompleteEvent,
  isRelevantSkillsStep,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { ConversationStateManager, ModelProvider } from '@kbn/agent-builder-server/runner';
import {
  createAttachmentStateManager,
  type AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import {
  AgentPromptType,
  AgentPromptRequestSourceType,
} from '@kbn/agent-builder-common/agents/prompts';
import { createRound } from '../../../../test_utils/conversations';
import type { ConvertedEvents } from '../convert_graph_events';
import { createFinalStateEvent } from '../events';
import { addRoundCompleteEvent } from './add_round_complete_event';

describe('addRoundCompleteEvent', () => {
  const createDeps = () => ({
    getConversationState: jest.fn(() => ({})),
    modelProvider: {
      getUsageStats: jest.fn(() => ({ calls: [] })),
    } as unknown as ModelProvider,
    stateManager: {} as unknown as ConversationStateManager,
    attachmentStateManager: {
      getAccessedRefs: jest.fn(() => []),
      getAll: jest.fn(() => []),
    } as unknown as AttachmentStateManager,
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
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingRound: undefined,
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

  it('preserves the original round origin and author when resuming a pending round', async () => {
    const pendingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      origin: { type: ConversationOriginType.Slack },
      author: { id: 'U123', full_name: 'Jane Doe', username: 'jane' },
      input: {
        message: '@agent summarize this',
      },
    });
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: {
        message_id: 'message-1',
        message_content: 'Done',
      },
    };

    const events = await firstValueFrom(
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingRound,
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

  it('stamps the resolved author on the round when there is no origin', async () => {
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: {
        message_id: 'message-1',
        message_content: 'Done',
      },
    };

    const events = await firstValueFrom(
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingRound: undefined,
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
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          pendingRound: undefined,
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
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          pendingRound: undefined,
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
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          pendingRound: undefined,
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
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          attachmentStateManager,
          pendingRound: undefined,
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

  // Runs a fresh (non-pending) round with an optional relevant-skills selection.
  const runFreshRound = (
    relevantSkillsSelection?: Parameters<typeof addRoundCompleteEvent>[0]['relevantSkillsSelection']
  ) => {
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'message-1', message_content: 'Done' },
    };
    return firstValueFrom(
      of(
        createFinalStateEvent({ currentCycle: 0, errorCount: 0 } as never) as ConvertedEvents,
        messageCompleteEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingRound: undefined,
          userInput: { message: 'do a thing' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
          relevantSkillsSelection,
        }),
        toArray()
      )
    );
  };

  it('adds a relevant_skills step for a fresh round when a non-empty selection is provided', async () => {
    const skills = [
      {
        id: 'a.alpha',
        name: 'alpha',
        path: '/p/SKILL.md',
        description: 'Alpha',
        relevance_note: 'fits',
      },
    ];
    const events = await runFreshRound({ skills });

    const round = events.find(isRoundCompleteEvent)?.data.round;
    const step = round?.steps.find(isRelevantSkillsStep);
    expect(step).toBeDefined();
    expect(step?.source).toBe('implicit');
    expect(step?.skills).toEqual(skills);
  });

  it('adds no relevant_skills step when the selection is empty', async () => {
    const events = await runFreshRound({ skills: [] });
    const round = events.find(isRoundCompleteEvent)?.data.round;
    expect(round?.steps.some(isRelevantSkillsStep)).toBe(false);
  });

  it('adds no relevant_skills step when no selection is provided', async () => {
    const events = await runFreshRound(undefined);
    const round = events.find(isRoundCompleteEvent)?.data.round;
    expect(round?.steps.some(isRelevantSkillsStep)).toBe(false);
  });

  it('completes a round interrupted by a browser tool call prompt without a tool-call step', async () => {
    // Browser tool calls emit a browserToolCall event instead of a toolCall event, so the
    // round has no matching tool-call step. buildRoundState must not require one.
    const promptRequestEvent: ChatEvent = {
      type: ChatEventType.promptRequest,
      data: {
        prompt: {
          type: AgentPromptType.browser_tool_call,
          id: 'prompt-1',
          tool_id: 'capture_dashboard_screenshot',
          params: { dashboardAttachmentId: 'dash-1' },
          result_type: 'image',
        },
        source: {
          type: AgentPromptRequestSourceType.toolCall,
          tool_call_id: 'toolu_vrtx_123',
        },
      },
    };

    const events = await firstValueFrom(
      of(
        createFinalStateEvent({ currentCycle: 1, errorCount: 0 } as never) as ConvertedEvents,
        promptRequestEvent as ConvertedEvents
      ).pipe(
        addRoundCompleteEvent({
          ...createDeps(),
          pendingRound: undefined,
          userInput: { message: 'validate the dashboard' },
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const round = events.find(isRoundCompleteEvent)?.data.round;
    expect(round?.status).toBe(ConversationRoundStatus.awaitingPrompt);
    expect(round?.pending_prompts).toEqual([
      expect.objectContaining({ id: 'prompt-1', type: AgentPromptType.browser_tool_call }),
    ]);
    // No node-state snapshot for the browser tool prompt.
    expect(round?.state?.agent.nodes).toEqual([]);
  });
});
