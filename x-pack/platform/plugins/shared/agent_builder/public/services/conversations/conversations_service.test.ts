/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import { publicApiPath, internalApiPath } from '../../../common/constants';
import { ConversationsService } from './conversations_service';

describe('ConversationsService', () => {
  it('creates an empty conversation for an agent', async () => {
    const post = jest.fn().mockResolvedValue({ id: 'conv-1' });
    const service = new ConversationsService({ http: { post } as never });

    const created = await service.create({ agentId: 'agent-1' });

    expect(post).toHaveBeenCalledWith(`${publicApiPath}/conversations`, {
      body: JSON.stringify({ agent_id: 'agent-1' }),
    });
    expect(created).toEqual({ id: 'conv-1' });
  });

  it('posts a thread to the _thread endpoint of its parent', async () => {
    const response = { thread_id: 'thread-1', conversation: { id: 'thread-1' } };
    const post = jest.fn().mockResolvedValue(response);
    const service = new ConversationsService({ http: { post } as never });

    const result = await service.createThread({
      parentId: 'parent-1',
      client_thread_id: 'thread-1',
      highlight: { text: 'dig into this' },
      connector_id: 'connector-1',
    });

    expect(post).toHaveBeenCalledWith(`${internalApiPath}/conversations/parent-1/_thread`, {
      body: JSON.stringify({
        client_thread_id: 'thread-1',
        highlight: { text: 'dig into this' },
        connector_id: 'connector-1',
      }),
    });
    expect(result).toEqual(response);
  });

  it('requests _search with the snake_case query mapping', async () => {
    const get = jest.fn().mockResolvedValue({
      pagination: { total: 0, page: 1, per_page: 25 },
      results: [],
    });
    const service = new ConversationsService({ http: { get } as never });

    await service.search({ query: 'sales', agentId: 'agent-1', page: 2, perPage: 25 });

    expect(get).toHaveBeenCalledWith(`${internalApiPath}/conversations/_search`, {
      query: {
        query: 'sales',
        agent_id: 'agent-1',
        page: 2,
        per_page: 25,
      },
    });
  });

  it('posts events to the _add_events endpoint', async () => {
    const event = {
      type: 'text_note',
      data: { text: 'this is a note' },
    };
    const responseBody = {
      events: [
        {
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          created_at: '2026-09-14T10:00:00.000Z',
          actor: { type: 'user', id: 'u_1', username: 'alice' },
          ...event,
        },
      ],
    };
    const post = jest.fn().mockResolvedValue(responseBody);
    const service = new ConversationsService({ http: { post } as never });

    const result = await service.addEvents({
      conversationId: 'conv-1',
      events: [event],
    });

    expect(post).toHaveBeenCalledWith(`${publicApiPath}/conversations/conv-1/_add_events`, {
      body: JSON.stringify({ events: [event] }),
    });
    expect(result).toEqual(responseBody);
  });

  it('updates conversation access control', async () => {
    const put = jest.fn().mockResolvedValue({
      access_mode: ConversationAccessControlMode.Private,
      entries: [],
    });
    const service = new ConversationsService({ http: { put } as never });
    const accessControl = {
      access_mode: ConversationAccessControlMode.Private,
      entries: [
        {
          type: 'user' as const,
          id: 'u_123',
          role: ConversationAccessControlRole.Member,
        },
      ],
    };

    await service.updateAccessControl({ conversationId: 'conversation-1', accessControl });

    expect(put).toHaveBeenCalledWith(
      `${publicApiPath}/conversations/conversation-1/access_control`,
      {
        body: JSON.stringify(accessControl),
      }
    );
  });
});
