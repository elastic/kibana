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
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { ConversationStateManager, ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
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

  it('stamps origin type on the round and origin author on the input for new rounds', async () => {
    const origin = {
      type: ConversationOriginType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      author: { id: 'U123', name: 'Jane Doe', handle: 'jane' },
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
          startTime: new Date('2026-01-01T00:00:00.000Z'),
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.origin).toEqual({
      type: ConversationOriginType.Slack,
    });
    expect(roundCompleteEvent?.data.round.input.origin).toEqual({
      author: { id: 'U123', name: 'Jane Doe', handle: 'jane' },
    });
  });

  it('preserves the original round origin when resuming a pending round', async () => {
    const pendingRound = createRound({
      status: ConversationRoundStatus.awaitingPrompt,
      origin: { type: ConversationOriginType.Slack },
      input: {
        message: '@agent summarize this',
        origin: { author: { id: 'U123', name: 'Jane Doe', handle: 'jane' } },
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
            author: { id: 'U999', name: 'John Roe', handle: 'john' },
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
    expect(roundCompleteEvent?.data.round.input.origin).toEqual({
      author: { id: 'U123', name: 'Jane Doe', handle: 'jane' },
    });
  });
});
