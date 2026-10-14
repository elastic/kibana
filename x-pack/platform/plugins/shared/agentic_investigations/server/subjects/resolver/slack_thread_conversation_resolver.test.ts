/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlackThreadConversationResolver } from './slack_thread_conversation_resolver';

const context = {
  origin: { type: 'slack', external_conversation_id: 'slack:T:C:1.1' },
  spaceId: 'default',
};

describe('createSlackThreadConversationResolver', () => {
  it('maps a claimed thread to its conversation by the Relay key', async () => {
    const getClaim = jest.fn().mockResolvedValue({ conversationId: 'inv-1' });
    const result = await createSlackThreadConversationResolver({ getClaim }).resolve(context);

    expect(getClaim).toHaveBeenCalledWith('default', { type: 'slack_thread', id: 'slack:T:C:1.1' });
    expect(result).toEqual({ status: 'held', conversationId: 'inv-1' });
  });

  it('is unbound without a claim', async () => {
    const getClaim = jest.fn().mockResolvedValue(undefined);
    expect(await createSlackThreadConversationResolver({ getClaim }).resolve(context)).toEqual({
      status: 'unbound',
    });
  });

  it('is unavailable, not unbound, when the lookup fails', async () => {
    const getClaim = jest.fn().mockRejectedValue(new Error('es down'));
    expect(await createSlackThreadConversationResolver({ getClaim }).resolve(context)).toEqual({
      status: 'unavailable',
      reason: 'lookup_failed',
    });
  });

  it('ignores other origins', async () => {
    const getClaim = jest.fn();
    const result = await createSlackThreadConversationResolver({ getClaim }).resolve({
      ...context,
      origin: { type: 'teams', external_conversation_id: 'x' },
    });
    expect(getClaim).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'unbound' });
  });
});
