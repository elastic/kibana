/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, toArray } from 'rxjs';
import {
  ChatEventType,
  ConversationSourceType,
  isRoundCompleteEvent,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { ConversationStateManager, ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
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

  it('persists round source authorship on the completed round', async () => {
    const sourceUser = {
      id: 'U123',
      name: 'Jane Doe',
      handle: 'jane',
    };
    const roundSourceInput = {
      source: {
        type: ConversationSourceType.Slack,
      },
    };
    const userInput = {
      message: '@agent summarize this',
      source: {
        user: sourceUser,
      },
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
          userInput,
          startTime: new Date('2026-01-01T00:00:00.000Z'),
          roundSourceInput,
        }),
        toArray()
      )
    );

    const roundCompleteEvent = events.find(isRoundCompleteEvent);

    expect(roundCompleteEvent?.data.round.source).toEqual({
      type: ConversationSourceType.Slack,
    });
    expect(roundCompleteEvent?.data.round.input.source).toEqual({
      user: {
        id: 'U123',
        name: 'Jane Doe',
        handle: 'jane',
      },
    });
  });
});
