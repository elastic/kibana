/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import {
  TYPEWRITER_ERASE_MS,
  TYPEWRITER_GAP_MS,
  TYPEWRITER_HOLD_MS,
  TYPEWRITER_TYPE_MS,
  useTypewriterLoop,
} from './use_typewriter_loop';

const messages = ['ab', 'cd'] as const;

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
};

describe('useTypewriterLoop', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();
  });

  it('returns an empty string when disabled', () => {
    const { result } = renderHook(() => useTypewriterLoop({ messages, enabled: false }));

    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_GAP_MS + TYPEWRITER_TYPE_MS * 10);
    });

    expect(result.current).toBe('');
  });

  it('types a message, holds, erases it, then types the next message', () => {
    const { result } = renderHook(() => useTypewriterLoop({ messages, enabled: true }));

    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_GAP_MS);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_TYPE_MS);
    });
    expect(result.current).toBe('ab');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_HOLD_MS);
    });
    expect(result.current).toBe('ab');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_ERASE_MS);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_ERASE_MS);
    });
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_GAP_MS);
    });
    expect(result.current).toBe('c');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_TYPE_MS);
    });
    expect(result.current).toBe('cd');
  });

  it('shows the first message immediately when reduced motion is preferred', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useTypewriterLoop({ messages, enabled: true }));

    expect(result.current).toBe('ab');

    act(() => {
      vi.advanceTimersByTime(TYPEWRITER_GAP_MS + TYPEWRITER_TYPE_MS * 10);
    });

    expect(result.current).toBe('ab');
  });
});
