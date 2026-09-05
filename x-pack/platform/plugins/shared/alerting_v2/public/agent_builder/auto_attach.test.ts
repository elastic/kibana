/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { registerAutoAttach, type AttachmentConverter } from './auto_attach';

interface TestItem {
  id: string;
  label: string;
}

const TEST_ATTACHMENT_TYPE = 'test-attachment';

const createItem = (overrides?: Partial<TestItem>): TestItem => ({
  id: 'item-1',
  label: 'Test item',
  ...overrides,
});

const testConverter: AttachmentConverter<TestItem> = {
  toAttachment: (item) => ({
    id: `test:${item.id}`,
    type: TEST_ATTACHMENT_TYPE,
    origin: item.id,
    data: { id: item.id, label: item.label },
  }),
  getOrigin: (item) => item.id,
};

describe('registerAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedItem$: BehaviorSubject<TestItem | undefined>;
  let addAttachment: jest.Mock;
  let removeAttachment: jest.Mock;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedItem$ = new BehaviorSubject<TestItem | undefined>(undefined);
    addAttachment = jest.fn();
    removeAttachment = jest.fn();
    chatEventsByConversationId = new Map();

    const chrome = {
      sidebar: {
        getCurrentAppId$: () => currentAppId$.asObservable(),
      },
    } as unknown as ChromeStart;

    const agentBuilder = {
      addAttachment,
      removeAttachment,
      events: {
        ui: { activeConversation$: activeConversation$.asObservable() },
        getChatEvents$: jest.fn((conversationId: string) => {
          let chatEvents$ = chatEventsByConversationId.get(conversationId);

          if (!chatEvents$) {
            chatEvents$ = new Subject<ChatEvent>();
            chatEventsByConversationId.set(conversationId, chatEvents$);
          }

          return chatEvents$.asObservable();
        }),
      },
    } as unknown as AgentBuilderPluginStart;

    cleanup = registerAutoAttach({
      agentBuilder,
      chrome,
      focusedItem$,
      converter: testConverter,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not attach when the Agent Builder sidebar is closed', () => {
    focusedItem$.next(createItem());
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('attaches the focused item to a new conversation draft when chat is open', () => {
    focusedItem$.next(createItem({ id: 'item-1', label: 'My item' }));
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'test:item-1',
      type: TEST_ATTACHMENT_TYPE,
      origin: 'item-1',
      data: expect.objectContaining({ id: 'item-1', label: 'My item' }),
    });
  });

  it('attaches when an existing conversation becomes active', () => {
    focusedItem$.next(createItem());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'item-1' }));
  });

  it('does not restage after the conversation is persisted', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('attaches when navigating to an item while an existing conversation is open', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'item-1' }));
  });

  it('attaches a different focused item after the conversation has started', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    focusedItem$.next(createItem({ id: 'item-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'test:item-2', origin: 'item-2' })
    );
  });

  it('uses deterministic ids from the converter', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();
    focusedItem$.next(createItem({ id: 'item-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'test:item-1', origin: 'item-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'test:item-2', origin: 'item-2' })
    );
  });

  it('removes the previous staged attachment before staging a new one', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(removeAttachment).not.toHaveBeenCalled();

    focusedItem$.next(createItem({ id: 'item-2' }));
    jest.runOnlyPendingTimers();

    expect(removeAttachment).toHaveBeenCalledTimes(1);
    expect(removeAttachment).toHaveBeenCalledWith('test:item-1');
    expect(addAttachment).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'test:item-2' }));
  });

  it('does not call removeAttachment on the first staging', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(removeAttachment).not.toHaveBeenCalled();
    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('removes the staged attachment when the focused item becomes undefined', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    focusedItem$.next(undefined);

    expect(removeAttachment).toHaveBeenCalledTimes(1);
    expect(removeAttachment).toHaveBeenCalledWith('test:item-1');
  });

  it('stages cleanly after navigating away and back with a different item', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    focusedItem$.next(undefined);

    expect(removeAttachment).toHaveBeenCalledTimes(1);
    expect(removeAttachment).toHaveBeenCalledWith('test:item-1');

    focusedItem$.next(createItem({ id: 'item-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'test:item-2' }));
    expect(removeAttachment).toHaveBeenCalledTimes(1);
  });

  it('does not remove when focused becomes undefined while sidebar is closed', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    currentAppId$.next(null);
    focusedItem$.next(undefined);

    expect(removeAttachment).not.toHaveBeenCalled();
  });

  it('removes the staged attachment on cleanup when the sidebar is open', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    cleanup();

    expect(removeAttachment).toHaveBeenCalledTimes(1);
    expect(removeAttachment).toHaveBeenCalledWith('test:item-1');
  });

  it('does not remove on cleanup when the sidebar is closed', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();

    currentAppId$.next(null);

    cleanup();

    expect(removeAttachment).not.toHaveBeenCalled();
  });

  it('unsubscribes on cleanup', () => {
    cleanup();

    focusedItem$.next(createItem());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
