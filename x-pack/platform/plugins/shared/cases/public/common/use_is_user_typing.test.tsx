/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { AppMockRenderer } from './mock';
import { createAppMockRenderer } from './mock';
import { useIsUserTyping } from './use_is_user_typing';

describe('useIsUserTyping', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('set isUserTyping=false on init', () => {
    const { result } = renderHook(() => useIsUserTyping(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.isUserTyping).toBe(false);
  });

  it('set isUserTyping to true with setIsUserTyping', () => {
    const { result } = renderHook(() => useIsUserTyping(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.setIsUserTyping(true);
    });

    expect(result.current.isUserTyping).toBe(true);
  });

  it('set isUserTyping to true onContentChange', () => {
    const { result } = renderHook(() => useIsUserTyping(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onContentChange('a value');
    });

    expect(result.current.isUserTyping).toBe(true);
  });

  it('does not set isUserTyping to true onContentChange when the value is empty', () => {
    const { result } = renderHook(() => useIsUserTyping(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onContentChange('');
    });

    expect(result.current.isUserTyping).toBe(false);
  });

  it('set isUserTyping to false onDebounce', () => {
    const { result } = renderHook(() => useIsUserTyping(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.setIsUserTyping(true);
    });

    expect(result.current.isUserTyping).toBe(true);

    act(() => {
      result.current.onDebounce();
    });

    expect(result.current.isUserTyping).toBe(false);
  });
});
