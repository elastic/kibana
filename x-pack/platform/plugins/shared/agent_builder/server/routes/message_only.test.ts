/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { ChatRequestBodyPayload } from '../../common/http_api/chat';
import { createConversationClientMock, createEmptyConversation } from '../test_utils/conversations';
import { getMessageOnlyHandler } from './message_only';
import { conversePayloadSchema, callbackConversePayloadSchema } from './chat';
import { chatPayloadSchema } from './chat_api';
import type { RouteDependencies } from './types';

const request = httpServerMock.createKibanaRequest();

describe('message-only contract', () => {
  const client = createConversationClientMock();
  const getInternalServices = jest.fn().mockReturnValue({
    conversations: {
      getScopedClient: async () => client,
      getConversationRoundAuthor: async () => ({ id: 'user' }),
    },
    attachments: { getTypeDefinition: jest.fn() },
    execution: { executeAgent: jest.fn() },
  });
  const persist = getMessageOnlyHandler({ getInternalServices } as Pick<
    RouteDependencies,
    'getInternalServices'
  >);
  beforeEach(() => {
    jest.clearAllMocks();
    client.getByOrigin.mockResolvedValue(undefined);
    client.appendUserMessage.mockImplementation(async ({ id, messageId }) =>
      createEmptyConversation({ id, events: [{ id: messageId }] as never })
    );
  });

  it.each([
    'prompts',
    'action',
    '_execution_mode',
    'execution_id',
    'connector_id',
    'inference_id',
    'browser_api_tools',
    'configuration_overrides',
    'project_routing',
  ])('rejects explicit %s without execution setup', async (option) => {
    await expect(
      persist({
        request,
        spaceId: 'default',
        payload: { trigger_mode: 'never', input: 'hello', [option]: {} },
      })
    ).rejects.toThrow(option);
    expect(getInternalServices).not.toHaveBeenCalled();
  });

  it('requires text or attachments', async () => {
    await expect(
      persist({ request, spaceId: 'default', payload: { trigger_mode: 'never' } })
    ).rejects.toThrow('input or attachments');
  });

  it('assigns distinct public identities', async () => {
    const payload: ChatRequestBodyPayload = {
      trigger_mode: 'never',
      input: 'hello',
    };
    const first = await persist({ request, spaceId: 'default', payload });
    const second = await persist({ request, spaceId: 'default', payload });
    expect(second.id).not.toBe(first.id);
    expect(second.events?.[0].id).not.toBe(first.events?.[0].id);
    expect(getInternalServices().execution.executeAgent).not.toHaveBeenCalled();
  });

  it('limits the new schema fields to supported endpoints', () => {
    expect(chatPayloadSchema.validate({ input: 'hi' }).trigger_mode).toBe('always');
    expect(chatPayloadSchema.validate({ input: 'hi', trigger_mode: 'never' })).toMatchObject({
      trigger_mode: 'never',
    });
    expect(() => conversePayloadSchema.validate({ input: 'hi', trigger_mode: 'never' })).toThrow();
    expect(() =>
      conversePayloadSchema.validate({
        input: 'hi',
        origin: { type: 'slack', external_conversation_id: 'thread' },
      })
    ).toThrow();
    expect(() => chatPayloadSchema.validate({ trigger_mode: 'auto' })).toThrow();
    expect(() =>
      callbackConversePayloadSchema.validate({
        trigger_mode: 'never',
        input: 'hi',
        execution_idempotency_key: 'key',
        callback: {
          url: 'https://callback.example.com/events',
        },
      })
    ).not.toThrow();
    expect(() =>
      callbackConversePayloadSchema.validate({ trigger_mode: 'never', input: 'hi' })
    ).toThrow();
    expect(() =>
      callbackConversePayloadSchema.validate({
        trigger_mode: 'never',
        input: 'hi',
        execution_idempotency_key: 'key',
      })
    ).toThrow('callback');
  });
});
