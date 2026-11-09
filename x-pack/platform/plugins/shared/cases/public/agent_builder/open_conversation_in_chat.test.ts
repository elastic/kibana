/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openConversationInChat } from './open_conversation_in_chat';

describe('openConversationInChat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes the sidebar it opened, then reopens with the other conversation on the next tick', () => {
    const close = jest.fn();
    const openChat = jest.fn().mockReturnValue({ chatRef: { close } });

    openConversationInChat({ openChat }, { conversationId: 'conv-1', agentId: 'agent-1' });
    expect(openChat).toHaveBeenCalledWith({ conversationId: 'conv-1', agentId: 'agent-1' });

    openConversationInChat({ openChat }, { conversationId: 'conv-2', agentId: 'agent-1' });
    expect(close).toHaveBeenCalledTimes(1);
    expect(openChat).toHaveBeenCalledTimes(1);

    jest.runAllTimers();
    expect(openChat).toHaveBeenLastCalledWith({ conversationId: 'conv-2', agentId: 'agent-1' });
  });

  it('does nothing without Agent Builder', () => {
    expect(() => openConversationInChat(undefined, { conversationId: 'conv-1' })).not.toThrow();
  });
});
