/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { AttachmentConverter } from '../../types';
import { useAutoAttach, type AutoAttachServices } from './use_auto_attach';

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

describe('useAutoAttach', () => {
  let addAttachment: jest.Mock;
  let removeAttachment: jest.Mock;
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let chatEvents$: Subject<ChatEvent>;
  let services: AutoAttachServices;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    addAttachment = jest.fn();
    removeAttachment = jest.fn();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    chatEvents$ = new Subject<ChatEvent>();

    services = {
      chrome: {
        sidebar: {
          getCurrentAppId$: () => currentAppId$.asObservable(),
        },
      } as unknown as ChromeStart,
      agentBuilder: {
        addAttachment,
        removeAttachment,
        events: {
          ui: { activeConversation$: activeConversation$.asObservable() },
          getChatEvents$: () => chatEvents$.asObservable(),
        },
      } as unknown as AgentBuilderPluginStart,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stages the item when sidebar is open on mount', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useAutoAttach({ id: 'item-1' }, converter, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test:item-1', origin: 'item-1' })
    );
  });

  it('does not stage when sidebar is closed', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useAutoAttach({ id: 'item-1' }, converter, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useAutoAttach({ id: 'item-1' }, converter, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('stages a new item when it changes', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    const { rerender } = renderHook(({ item }) => useAutoAttach(item, converter, services), {
      initialProps: { item: { id: 'item-1' } as TestItem | undefined },
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    rerender({ item: { id: 'item-2' } });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'test:item-2' }));
  });

  it('does not stage when item is undefined', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useAutoAttach(undefined, converter, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not stage when Agent Builder is unavailable', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);

    renderHook(() =>
      useAutoAttach({ id: 'item-1' }, converter, { ...services, agentBuilder: undefined })
    );
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useAutoAttach({ id: 'item-1' }, converter, services));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
