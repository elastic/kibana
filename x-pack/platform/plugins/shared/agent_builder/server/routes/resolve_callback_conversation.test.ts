/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ConversationOriginType, ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { ChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';
import type { ConversationResolution } from '@kbn/agent-builder-server';
import { RESOLVE_TIMEOUT_MS, resolveCallbackConversation } from './resolve_callback_conversation';

const payload = {
  input: 'what caused this?',
  agent_id: 'elastic-ai-agent',
  conversation_id: 'plain-thread-uuid',
  execution_idempotency_key: 'Ev1',
  origin: { type: ConversationOriginType.Slack, external_conversation_id: 'slack:T:C:1.1' },
  callback: { url: 'https://relay.example/callback' },
} as ChatCallbackRequestBodyPayload;

const run = (
  resolution: ConversationResolution,
  getConversation = jest
    .fn()
    .mockResolvedValue({ id: 'inv-1', agent_id: 'nightshift.investigation', has_rounds: true })
) => {
  const resolve = jest.fn().mockResolvedValue(resolution);
  return {
    resolve,
    getConversation,
    result: resolveCallbackConversation({
      payload,
      spaceId: 'default',
      conversationResolvers: { register: jest.fn(), resolve },
      getConversation,
      logger: loggerMock.create(),
    }),
  };
};

describe('resolveCallbackConversation', () => {
  it('runs on the claimed conversation with its stored agent and no auto-create', async () => {
    const { result } = run({ status: 'held', conversationId: 'inv-1' });
    expect(await result).toEqual({
      payload: { ...payload, conversation_id: 'inv-1', agent_id: 'nightshift.investigation' },
      autoCreateConversationWithId: false,
    });
  });

  it('keeps the plain conversation for an unbound thread', async () => {
    const { result } = run({ status: 'unbound' });
    expect(await result).toEqual({ payload, autoCreateConversationWithId: true });
  });

  it('keeps the plain conversation when the caller cannot read the claimed one', async () => {
    const { result } = run(
      { status: 'held', conversationId: 'inv-1' },
      jest.fn().mockRejectedValue(new Error('not found'))
    );
    expect(await result).toEqual({ payload, autoCreateConversationWithId: true });
  });

  it('keeps the plain conversation while the claimed investigation has no round yet', async () => {
    const { result } = run(
      { status: 'held', conversationId: 'inv-1' },
      jest
        .fn()
        .mockResolvedValue({ id: 'inv-1', agent_id: 'nightshift.investigation', has_rounds: false })
    );
    expect(await result).toEqual({ payload, autoCreateConversationWithId: true });
  });

  it('keeps the plain conversation while the claimed investigation is running a round', async () => {
    const { result } = run(
      { status: 'held', conversationId: 'inv-1' },
      jest.fn().mockResolvedValue({
        id: 'inv-1',
        agent_id: 'nightshift.investigation',
        has_rounds: true,
        status: ConversationRoundStatus.inProgress,
      })
    );
    expect(await result).toEqual({ payload, autoCreateConversationWithId: true });
  });

  it('keeps the plain conversation when the lookup is slow', async () => {
    jest.useFakeTimers();
    try {
      const resolve = jest.fn().mockReturnValue(new Promise(() => {}));
      const pending = resolveCallbackConversation({
        payload,
        spaceId: 'default',
        conversationResolvers: { register: jest.fn(), resolve },
        getConversation: jest.fn(),
        logger: loggerMock.create(),
      });
      await jest.advanceTimersByTimeAsync(RESOLVE_TIMEOUT_MS);
      expect(await pending).toEqual({ payload, autoCreateConversationWithId: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the plain conversation when resolution is unavailable', async () => {
    const { result } = run({ status: 'unavailable', reason: 'lookup_failed' });
    expect(await result).toEqual({ payload, autoCreateConversationWithId: true });
  });

  it('does not resolve a turn without a Slack origin', async () => {
    const resolve = jest.fn();
    const result = await resolveCallbackConversation({
      payload: { ...payload, origin: undefined },
      spaceId: 'default',
      conversationResolvers: { register: jest.fn(), resolve },
      getConversation: jest.fn(),
      logger: loggerMock.create(),
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(result.autoCreateConversationWithId).toBe(true);
  });
});
