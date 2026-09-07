/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { AttachmentConverter } from '../../types/attachment_converter';
import { useAutoAttach } from './use_auto_attach';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

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

  const setupMocks = () => {
    mockCoreStart.mockImplementation((key: string) => `core:${key}` as never);

    mockUseService.mockImplementation((token: unknown) => {
      if (token === 'core:chrome') {
        return {
          sidebar: {
            getCurrentAppId$: () => currentAppId$.asObservable(),
          },
        };
      }
      if (token === PluginStart('agentBuilder')) {
        return {
          addAttachment,
          removeAttachment,
          events: {
            ui: { activeConversation$: activeConversation$.asObservable() },
            getChatEvents$: () => chatEvents$.asObservable(),
          },
        };
      }
      return undefined;
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    addAttachment = jest.fn();
    removeAttachment = jest.fn();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    chatEvents$ = new Subject<ChatEvent>();
    setupMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stages the item when sidebar is open on mount', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useAutoAttach({ id: 'item-1' }, converter));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test:item-1', origin: 'item-1' })
    );
  });

  it('does not stage when sidebar is closed', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useAutoAttach({ id: 'item-1' }, converter));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useAutoAttach({ id: 'item-1' }, converter));
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

    const { rerender } = renderHook(({ item }) => useAutoAttach(item, converter), {
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

    renderHook(() => useAutoAttach(undefined, converter));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not stage when Agent Builder plugin is unavailable', () => {
    mockUseService.mockImplementation((token: unknown) => {
      if (token === 'core:chrome') {
        return {
          sidebar: { getCurrentAppId$: () => currentAppId$.asObservable() },
        };
      }
      return undefined;
    });

    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    renderHook(() => useAutoAttach({ id: 'item-1' }, converter));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useAutoAttach({ id: 'item-1' }, converter));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
