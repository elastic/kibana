/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { AttachmentConverter } from '../../types';
import { useManualAddToChat, type ManualAddToChatServices } from './use_manual_add_to_chat';

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

describe('useManualAddToChat', () => {
  let openChat: jest.Mock;
  let addAttachment: jest.Mock;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let services: ManualAddToChatServices;

  beforeEach(() => {
    jest.clearAllMocks();
    openChat = jest.fn();
    addAttachment = jest.fn();
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);

    services = {
      agentBuilder: {
        openChat,
        addAttachment,
        events: {
          ui: { activeConversation$: activeConversation$.asObservable() },
        },
      } as unknown as AgentBuilderPluginStart,
    };
  });

  it('reports available when agentBuilder and item are present', () => {
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter, services));

    expect(result.current.isAddToChatAvailable).toBe(true);
  });

  it('reports unavailable when item is undefined', () => {
    const { result } = renderHook(() => useManualAddToChat(undefined, converter, services));

    expect(result.current.isAddToChatAvailable).toBe(false);
  });

  it('reports unavailable when agentBuilder is not available', () => {
    const { result } = renderHook(() =>
      useManualAddToChat({ id: 'item-1' }, converter, { agentBuilder: undefined })
    );

    expect(result.current.isAddToChatAvailable).toBe(false);
  });

  it('opens a new chat on addToChat when no conversation is bound', () => {
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter, services));

    act(() => {
      result.current.addToChat();
    });

    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSendInitialMessage: false,
        newConversation: true,
        attachments: [expect.objectContaining({ id: 'test:item-1' })],
      })
    );
  });

  it('adds attachment to existing conversation when chat is bound', () => {
    activeConversation$.next({ id: 'conv-1', conversation: undefined });

    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter, services));

    act(() => {
      result.current.addToChat();
    });

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: 'test:item-1' }));
    expect(openChat).not.toHaveBeenCalled();
  });

  it('does nothing when item is undefined and addToChat is called', () => {
    const { result } = renderHook(() => useManualAddToChat(undefined, converter, services));

    act(() => {
      result.current.addToChat();
    });

    expect(openChat).not.toHaveBeenCalled();
    expect(addAttachment).not.toHaveBeenCalled();
  });
});
