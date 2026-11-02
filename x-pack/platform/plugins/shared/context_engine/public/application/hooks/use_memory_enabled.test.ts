/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { act, renderHook } from '@testing-library/react';
import { useKibana } from './use_kibana';
import { useMemoryEnabled } from './use_memory_enabled';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = jest.mocked(useKibana);

describe('useMemoryEnabled', () => {
  const get = jest.fn();
  const get$ = jest.fn();
  const subscribe = jest.fn();
  const unsubscribes: jest.Mock[] = [];
  let emit: ((enabled: boolean) => void) | undefined;

  beforeEach(() => {
    get.mockReturnValue(false);
    subscribe.mockImplementation((next: (enabled: boolean) => void) => {
      emit = next;
      const unsubscribe = jest.fn();
      unsubscribes.push(unsubscribe);
      return { unsubscribe };
    });
    get$.mockReturnValue({ subscribe });
    mockUseKibana.mockReturnValue({
      services: {
        settings: {
          globalClient: { get, get$ },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    jest.clearAllMocks();
    unsubscribes.length = 0;
    emit = undefined;
  });

  it('defaults to disabled and subscribes to global setting updates', () => {
    const { result } = renderHook(() => useMemoryEnabled());

    expect(result.current).toBe(false);
    expect(get).toHaveBeenCalledWith(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID, false);
    expect(get$).toHaveBeenCalledWith(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID, false);

    act(() => emit?.(true));

    expect(result.current).toBe(true);
  });

  it('uses the current global setting before the subscription emits', () => {
    get.mockReturnValue(true);

    const { result } = renderHook(() => useMemoryEnabled());

    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useMemoryEnabled());
    const activeUnsubscribe = unsubscribes[unsubscribes.length - 1];

    unmount();

    expect(activeUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
