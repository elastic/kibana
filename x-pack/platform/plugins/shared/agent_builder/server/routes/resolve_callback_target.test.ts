/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { ConversationOriginType, createConversationNotFoundError } from '@kbn/agent-builder-common';
import type { ChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';
import { createConversationClientMock, createEmptyConversation } from '../test_utils/conversations';
import { resolveCallbackTarget } from './resolve_callback_target';

describe('resolveCallbackTarget', () => {
  const request = httpServerMock.createKibanaRequest();
  const origin = { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' };
  const payload = {
    agent_id: 'relay-agent',
    input: 'What happened?',
    execution_idempotency_key: 'event-1',
    origin,
    callback: { url: 'https://relay.example.com/callback' },
  } as ChatCallbackRequestBodyPayload;

  const setup = () => {
    const client = createConversationClientMock();
    const resolveConversation = jest.fn().mockResolvedValue(undefined);
    const getExecution = jest.fn().mockResolvedValue(undefined);
    const resolve = (overrides: Partial<ChatCallbackRequestBodyPayload> = {}) =>
      resolveCallbackTarget({
        payload: { ...payload, ...overrides },
        spaceId: 'default',
        executionId: 'execution-1',
        request,
        callbackDeliveryService: { resolveConversation },
        conversations: { getScopedClient: jest.fn().mockResolvedValue(client) },
        executionService: { getExecution },
      });
    return { client, resolveConversation, getExecution, resolve };
  };

  it('continues the resolved conversation on its stored agent', async () => {
    const { client, resolveConversation, resolve } = setup();
    resolveConversation.mockResolvedValue({ conversationId: 'investigation-1' });
    client.get.mockResolvedValue(
      createEmptyConversation({ id: 'investigation-1', agent_id: 'investigation-agent' })
    );

    const target = await resolve();

    expect(resolveConversation).toHaveBeenCalledWith({ origin, spaceId: 'default', request });
    expect(client.get).toHaveBeenCalledWith('investigation-1');
    expect(target).toEqual({
      payload: { ...payload, conversation_id: 'investigation-1', agent_id: 'investigation-agent' },
      autoCreateConversationWithId: false,
    });
  });

  it('keeps the payload when nothing resolves the origin', async () => {
    const { resolve } = setup();

    await expect(resolve()).resolves.toEqual({ payload, autoCreateConversationWithId: true });
  });

  it('keeps the payload without resolving when the request names its conversation', async () => {
    const { resolveConversation, resolve } = setup();

    const target = await resolve({ conversation_id: 'conversation-1' });

    expect(target.payload.conversation_id).toBe('conversation-1');
    expect(target.autoCreateConversationWithId).toBe(true);
    expect(resolveConversation).not.toHaveBeenCalled();
  });

  it('keeps the payload without resolving when the request has no origin', async () => {
    const { resolveConversation, resolve } = setup();

    await resolve({ origin: undefined });

    expect(resolveConversation).not.toHaveBeenCalled();
  });

  it('leaves a replay to the execution service without resolving', async () => {
    const { resolveConversation, getExecution, resolve } = setup();
    getExecution.mockResolvedValue({ executionId: 'execution-1' });

    await expect(resolve()).resolves.toEqual({ payload, autoCreateConversationWithId: true });
    expect(getExecution).toHaveBeenCalledWith('execution-1');
    expect(resolveConversation).not.toHaveBeenCalled();
  });

  it('propagates a resolver error', async () => {
    const { resolveConversation, resolve } = setup();
    resolveConversation.mockRejectedValue(new Error('lookup failed'));

    await expect(resolve()).rejects.toThrow('lookup failed');
  });

  it('propagates when the caller cannot read the resolved conversation', async () => {
    const { client, resolveConversation, resolve } = setup();
    resolveConversation.mockResolvedValue({ conversationId: 'investigation-1' });
    client.get.mockRejectedValue(
      createConversationNotFoundError({ conversationId: 'investigation-1' })
    );

    await expect(resolve()).rejects.toThrow('investigation-1');
  });
});
