/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCursorPagination } from './use_cursor_pagination';

describe('useCursorPagination', () => {
  it('starts at page 0 with no cursor', () => {
    const { result } = renderHook(() => useCursorPagination());

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.currentCursor).toBeUndefined();
  });

  it('goToNextPage advances page and sets cursor', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goToNextPage('cursor-1'));

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.currentCursor).toBe('cursor-1');
  });

  it('goToNextPage builds cursor stack across multiple pages', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goToNextPage('cursor-1'));
    act(() => result.current.goToNextPage('cursor-2'));
    act(() => result.current.goToNextPage('cursor-3'));

    expect(result.current.pageIndex).toBe(3);
    expect(result.current.currentCursor).toBe('cursor-3');
  });

  it('goToPage navigates backward to a specific page', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goToNextPage('cursor-1'));
    act(() => result.current.goToNextPage('cursor-2'));
    act(() => result.current.goToNextPage('cursor-3'));
    act(() => result.current.goToPage(1));

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.currentCursor).toBe('cursor-1');
  });

  it('goToPage(0) resets to initial state', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goToNextPage('cursor-1'));
    act(() => result.current.goToNextPage('cursor-2'));
    act(() => result.current.goToPage(0));

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.currentCursor).toBeUndefined();
  });

  it('goToPage with current or future index is a no-op', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goToNextPage('cursor-1'));
    act(() => result.current.goToPage(1));

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.currentCursor).toBe('cursor-1');

    act(() => result.current.goToPage(5));

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.currentCursor).toBe('cursor-1');
  });

  it('resetPagination clears all state', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goToNextPage('cursor-1'));
    act(() => result.current.goToNextPage('cursor-2'));
    act(() => result.current.resetPagination());

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.currentCursor).toBeUndefined();
  });

  it('can navigate forward again after reset', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goToNextPage('cursor-1'));
    act(() => result.current.resetPagination());
    act(() => result.current.goToNextPage('cursor-new'));

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.currentCursor).toBe('cursor-new');
  });
});
