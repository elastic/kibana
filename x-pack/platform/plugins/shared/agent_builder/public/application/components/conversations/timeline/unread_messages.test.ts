/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unreadMessageKeys } from './unread_messages';
import {
  createAgentMessageItem,
  createCompletedTurnItem,
  createUserMessageItem,
} from './items/timeline_item.factory';
import { createAgentMessageEvent } from './items/agent_message_event.factory';
import { createUserMessageEvent } from './items/user_message_event.factory';

describe('unreadMessageKeys', () => {
  const message = (id: string, createdAt: string) =>
    createUserMessageItem({
      key: id,
      event: createUserMessageEvent({ id, created_at: createdAt }),
    });

  it('keeps only the messages no run started from or after', () => {
    const unread = unreadMessageKeys([
      message('started-a-run', '2026-01-01T00:00:00.000Z'),
      createCompletedTurnItem({
        triggerEventId: 'started-a-run',
        startedAt: '2026-01-01T00:00:01.000Z',
      }),
      message('read-later', '2026-01-01T00:00:02.000Z'),
      message('next', '2026-01-01T00:00:03.000Z'),
      createCompletedTurnItem({ triggerEventId: 'next', startedAt: '2026-01-01T00:00:04.000Z' }),
      createAgentMessageItem({
        key: 'waiting',
        event: createAgentMessageEvent({ id: 'waiting', created_at: '2026-01-01T00:00:05.000Z' }),
      }),
    ]);

    expect(Array.from(unread)).toEqual(['waiting']);
  });
});
