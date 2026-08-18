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
import { ChatEventType, type ChatEvent } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { registerAutoAttach, type AttachmentConverter, type IdGenerator } from './auto_attach';

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
  toAttachment: (item, draftId) => ({
    id: draftId,
    type: TEST_ATTACHMENT_TYPE,
    origin: item.id,
    data: { id: item.id, label: item.label },
  }),
  getOrigin: (item) => item.id,
};

const createVersionedAttachment = (id: string): VersionedAttachment => ({
  id,
  type: TEST_ATTACHMENT_TYPE,
  versions: [
    {
      version: 1,
      data: createItem(),
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'hash',
    },
  ],
  current_version: 1,
});

const createRoundCompleteEvent = (attachmentId: string): ChatEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: {} as never,
    attachments: [createVersionedAttachment(attachmentId)],
  },
});

const createIdGenerator = (): IdGenerator => {
  let current = 'draft-id-1';

  return {
    get current() {
      return current;
    },
    next: jest.fn(() => {
      current = current === 'draft-id-1' ? 'draft-id-2' : 'draft-id-3';
      return current;
    }),
  };
};

describe('registerAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedItem$: BehaviorSubject<TestItem | undefined>;
  let addAttachment: jest.Mock;
  let draftAttachmentId: IdGenerator;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedItem$ = new BehaviorSubject<TestItem | undefined>(undefined);
    addAttachment = jest.fn();
    draftAttachmentId = createIdGenerator();
    chatEventsByConversationId = new Map();

    const chrome = {
      sidebar: {
        getCurrentAppId$: () => currentAppId$.asObservable(),
      },
    } as unknown as ChromeStart;

    const agentBuilder = {
      addAttachment,
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
      draftAttachmentId,
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
      id: 'draft-id-1',
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
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-1', origin: 'item-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    focusedItem$.next(createItem({ id: 'item-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-2', origin: 'item-2' })
    );
  });

  it('updates the same draft attachment when the focused item changes before send', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedItem$.next(createItem({ id: 'item-1' }));
    jest.runOnlyPendingTimers();
    focusedItem$.next(createItem({ id: 'item-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'draft-id-1', origin: 'item-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'draft-id-1', origin: 'item-2' })
    );
  });

  it('rotates the draft id after it is created in a completed round', () => {
    focusedItem$.next(createItem());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    chatEventsByConversationId.get('conversation-1')?.next(createRoundCompleteEvent('draft-id-1'));

    currentAppId$.next(null);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'draft-id-3' }));
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
