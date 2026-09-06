/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { AttachmentConverter } from './auto_attach';
import { useManualAddToChat } from './use_manual_add_to_chat';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;

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

  beforeEach(() => {
    jest.clearAllMocks();
    openChat = jest.fn();
    addAttachment = jest.fn();
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    mockUseService.mockImplementation((token: unknown) => {
      if (token === PluginStart('agentBuilder')) {
        return {
          openChat,
          addAttachment,
          events: { ui: { activeConversation$ } },
        };
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is available when Agent Builder and an item are present', () => {
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    expect(result.current.isAddToChatAvailable).toBe(true);
  });

  it('is unavailable when the item is undefined', () => {
    const { result } = renderHook(() => useManualAddToChat(undefined, converter));

    expect(result.current.isAddToChatAvailable).toBe(false);
  });

  it('is unavailable when Agent Builder is missing', () => {
    mockUseService.mockReturnValue(undefined);

    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    expect(result.current.isAddToChatAvailable).toBe(false);
  });

  it('opens a new conversation with the converted attachment when no chat is bound', () => {
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    result.current.addToChat();

    expect(openChat).toHaveBeenCalledWith({
      autoSendInitialMessage: false,
      newConversation: true,
      attachments: [
        {
          id: 'test:item-1',
          type: 'test-attachment',
          origin: 'item-1',
          data: { id: 'item-1' },
        },
      ],
    });
    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('adds to the bound chat instead of starting a new conversation', () => {
    activeConversation$.next({ id: 'conversation-1' });
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    result.current.addToChat();

    expect(openChat).not.toHaveBeenCalled();
    expect(addAttachment).toHaveBeenCalledWith({
      id: 'test:item-1',
      type: 'test-attachment',
      origin: 'item-1',
      data: { id: 'item-1' },
    });
  });

  it('does not open chat when the item is undefined', () => {
    const { result } = renderHook(() => useManualAddToChat(undefined, converter));

    result.current.addToChat();

    expect(openChat).not.toHaveBeenCalled();
    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('restages the attachment when switching to a new conversation draft', () => {
    jest.useFakeTimers();
    activeConversation$.next({ id: 'conversation-1' });
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    result.current.addToChat();
    addAttachment.mockClear();

    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'test:item-1',
      type: 'test-attachment',
      origin: 'item-1',
      data: { id: 'item-1' },
    });
  });

  it('restages the attachment when switching to a different conversation', () => {
    jest.useFakeTimers();
    activeConversation$.next({ id: 'conversation-1' });
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    result.current.addToChat();
    addAttachment.mockClear();

    activeConversation$.next({ id: 'conversation-2' });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('does not restage when a draft conversation is persisted', () => {
    jest.useFakeTimers();
    activeConversation$.next({ id: undefined });
    const { result } = renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    result.current.addToChat();
    addAttachment.mockClear();

    activeConversation$.next({ id: 'conversation-1' });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not restage before addToChat is clicked', () => {
    jest.useFakeTimers();
    activeConversation$.next({ id: 'conversation-1' });
    renderHook(() => useManualAddToChat({ id: 'item-1' }, converter));

    activeConversation$.next({ id: 'conversation-2' });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
