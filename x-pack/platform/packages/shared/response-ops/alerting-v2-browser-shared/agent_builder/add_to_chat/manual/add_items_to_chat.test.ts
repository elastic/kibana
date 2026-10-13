/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { AttachmentConverter } from '../../types';
import { addItemsToChat } from './add_items_to_chat';

interface TestItem {
  id: string;
}

const TEST_ATTACHMENT_TYPE = 'test-attachment';

const converter: AttachmentConverter<TestItem> = {
  toAttachment: (item) => ({
    id: `test:${item.id}`,
    type: TEST_ATTACHMENT_TYPE,
    origin: item.id,
    data: { id: item.id },
  }),
  getOrigin: (item) => item.id,
};

describe('addItemsToChat', () => {
  let openChat: jest.MockedFunction<AgentBuilderPluginStart['openChat']>;
  let addAttachment: jest.Mock;

  beforeEach(() => {
    openChat = jest.fn();
    addAttachment = jest.fn();
  });

  it('does nothing when items is empty', () => {
    addItemsToChat(openChat, [], converter);

    expect(openChat).not.toHaveBeenCalled();
  });

  it('opens a new chat with attachments when no conversation is bound', () => {
    addItemsToChat(openChat, [{ id: 'a' }, { id: 'b' }], converter);

    expect(openChat).toHaveBeenCalledWith({
      autoSendInitialMessage: false,
      newConversation: true,
      attachments: [
        expect.objectContaining({ id: 'test:a', type: TEST_ATTACHMENT_TYPE }),
        expect.objectContaining({ id: 'test:b', type: TEST_ATTACHMENT_TYPE }),
      ],
    });
  });

  it('does nothing when openChat is undefined and no conversation is bound', () => {
    addItemsToChat(undefined, [{ id: 'a' }], converter);

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('adds attachments to the bound conversation instead of opening a new chat', () => {
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>({
      id: 'conv-1',
      conversation: undefined,
    });

    addItemsToChat(openChat, [{ id: 'a' }], converter, {
      addAttachment,
      activeConversation$,
    });

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test:a', type: TEST_ATTACHMENT_TYPE })
    );
    expect(openChat).not.toHaveBeenCalled();
  });

  it('falls back to openChat when activeConversation$ is null (unbound)', () => {
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);

    addItemsToChat(openChat, [{ id: 'a' }], converter, {
      addAttachment,
      activeConversation$,
    });

    expect(addAttachment).not.toHaveBeenCalled();
    expect(openChat).toHaveBeenCalled();
  });

  it('falls back to openChat when addAttachment is not provided', () => {
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>({
      id: 'conv-1',
      conversation: undefined,
    });

    addItemsToChat(openChat, [{ id: 'a' }], converter, { activeConversation$ });

    expect(openChat).toHaveBeenCalled();
  });

  it('adds multiple attachments to the bound conversation', () => {
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>({
      id: 'conv-1',
      conversation: undefined,
    });

    addItemsToChat(openChat, [{ id: 'a' }, { id: 'b' }], converter, {
      addAttachment,
      activeConversation$,
    });

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'test:a' }));
    expect(addAttachment).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'test:b' }));
  });
});
