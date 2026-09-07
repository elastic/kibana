/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { TARGET_LOOKUP_DEBOUNCE_MS } from '../constants';
import { useTargetIdSearchState } from './use_target_id_search_state';

describe('useTargetIdSearchState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('syncs search values from target id and debounces updates', () => {
    const { result, rerender } = renderHook(
      ({ targetId }: { targetId: string }) => useTargetIdSearchState({ targetId }),
      { initialProps: { targetId: 'initial' } }
    );

    expect(result.current.targetIdSearchValue).toBe('initial');
    expect(result.current.debouncedTargetSearchValue).toBe('initial');

    act(() => {
      result.current.setTargetIdSearchValue('logs');
    });
    expect(result.current.targetIdSearchValue).toBe('logs');
    expect(result.current.debouncedTargetSearchValue).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(TARGET_LOOKUP_DEBOUNCE_MS);
    });
    expect(result.current.debouncedTargetSearchValue).toBe('logs');

    rerender({ targetId: 'from-profile' });
    expect(result.current.targetIdSearchValue).toBe('from-profile');
    expect(result.current.debouncedTargetSearchValue).toBe('from-profile');
  });
});
