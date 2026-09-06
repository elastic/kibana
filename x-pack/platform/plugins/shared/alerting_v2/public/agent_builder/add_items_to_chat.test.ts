/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { AttachmentConverter } from './auto_attach';
import { addItemsToChat } from './add_items_to_chat';

interface TestItem {
  id: string;
}

const converter: AttachmentConverter<TestItem> = {
  toAttachment: (item) => ({
    id: `test:${item.id}`,
    type: 'test-attachment',
    origin: item.id,
    data: { id: item.id },
  }),
  getOrigin: (item) => item.id,
};

describe('addItemsToChat', () => {
  it('opens a new conversation with converted attachments when no chat is bound', () => {
    const openChat = jest.fn();

    addItemsToChat(openChat, [{ id: 'a' }, { id: 'b' }], converter);

    expect(openChat).toHaveBeenCalledWith({
      autoSendInitialMessage: false,
      newConversation: true,
      attachments: [
        { id: 'test:a', type: 'test-attachment', origin: 'a', data: { id: 'a' } },
        { id: 'test:b', type: 'test-attachment', origin: 'b', data: { id: 'b' } },
      ],
    });
  });

  it('adds attachments to the bound chat instead of starting a new conversation', () => {
    const openChat = jest.fn();
    const addAttachment = jest.fn();
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>({
      id: 'conversation-1',
    });

    addItemsToChat(openChat, [{ id: 'a' }, { id: 'b' }], converter, {
      addAttachment,
      activeConversation$,
    });

    expect(openChat).not.toHaveBeenCalled();
    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(1, {
      id: 'test:a',
      type: 'test-attachment',
      origin: 'a',
      data: { id: 'a' },
    });
    expect(addAttachment).toHaveBeenNthCalledWith(2, {
      id: 'test:b',
      type: 'test-attachment',
      origin: 'b',
      data: { id: 'b' },
    });
  });

  it('adds attachments to a bound new-conversation draft', () => {
    const openChat = jest.fn();
    const addAttachment = jest.fn();
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>({
      id: undefined,
    });

    addItemsToChat(openChat, [{ id: 'a' }], converter, {
      addAttachment,
      activeConversation$,
    });

    expect(openChat).not.toHaveBeenCalled();
    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith({
      id: 'test:a',
      type: 'test-attachment',
      origin: 'a',
      data: { id: 'a' },
    });
  });

  it('opens a new conversation when the chat surface is unbound', () => {
    const openChat = jest.fn();
    const addAttachment = jest.fn();
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);

    addItemsToChat(openChat, [{ id: 'a' }], converter, {
      addAttachment,
      activeConversation$,
    });

    expect(addAttachment).not.toHaveBeenCalled();
    expect(openChat).toHaveBeenCalledWith({
      autoSendInitialMessage: false,
      newConversation: true,
      attachments: [{ id: 'test:a', type: 'test-attachment', origin: 'a', data: { id: 'a' } }],
    });
  });

  it('does not open chat when openChat is undefined', () => {
    expect(() => addItemsToChat(undefined, [{ id: 'a' }], converter)).not.toThrow();
  });

  it('does not open chat when there are no items', () => {
    const openChat = jest.fn();

    addItemsToChat(openChat, [], converter);

    expect(openChat).not.toHaveBeenCalled();
  });
});
