/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { LOCAL_STORAGE_KEYS } from '../../../../../../../common/constants';
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  clampSidebarWidth,
  useSidebarResize,
} from './use_sidebar_resize';

const mockUseCasesLocalStorage = jest.fn();
jest.mock('../../../../../../common/use_cases_local_storage', () => ({
  useCasesLocalStorage: (...args: unknown[]) => mockUseCasesLocalStorage(...args),
}));

const pointerDown = (clientX: number) =>
  ({
    clientX,
    pointerId: 1,
    // The rail captures the pointer so the drag survives passing over an embeddable.
    currentTarget: { setPointerCapture: jest.fn() },
  } as unknown as ReactPointerEvent<HTMLButtonElement>);

const arrowKey = (key: string, preventDefault = jest.fn()) =>
  ({ key, preventDefault } as unknown as ReactKeyboardEvent<HTMLButtonElement>);

const dragTo = (clientX: number) =>
  window.dispatchEvent(new MouseEvent('pointermove', { clientX }));

const endDrag = () => window.dispatchEvent(new MouseEvent('pointerup'));

describe('useSidebarResize', () => {
  let setStoredWidth: jest.Mock;

  const mockStoredWidth = (width: number) => {
    mockUseCasesLocalStorage.mockReturnValue([width, setStoredWidth]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setStoredWidth = jest.fn();
    mockStoredWidth(DEFAULT_SIDEBAR_WIDTH);
  });

  describe('clampSidebarWidth', () => {
    it('keeps the width inside the supported range', () => {
      expect(clampSidebarWidth(MIN_SIDEBAR_WIDTH - 100)).toBe(MIN_SIDEBAR_WIDTH);
      expect(clampSidebarWidth(MAX_SIDEBAR_WIDTH + 100)).toBe(MAX_SIDEBAR_WIDTH);
      expect(clampSidebarWidth(400.4)).toBe(400);
    });
  });

  it('uses the sidebar width local storage key', () => {
    renderHook(() => useSidebarResize());

    expect(mockUseCasesLocalStorage).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEYS.caseViewSidebarWidth,
      DEFAULT_SIDEBAR_WIDTH
    );
  });

  it('clamps a stored width that is outside the supported range', () => {
    mockStoredWidth(5000);

    const { result } = renderHook(() => useSidebarResize());

    expect(result.current.width).toBe(MAX_SIDEBAR_WIDTH);
  });

  it('grows the sidebar when dragged towards the start of the row, and persists on release', () => {
    const { result } = renderHook(() => useSidebarResize());

    act(() => result.current.onPointerDown(pointerDown(800)));
    act(() => dragTo(760));

    // Mid-drag the width goes straight to the DOM, so nothing is persisted until release.
    expect(setStoredWidth).not.toHaveBeenCalled();

    act(() => endDrag());

    expect(setStoredWidth).toHaveBeenCalledWith(DEFAULT_SIDEBAR_WIDTH + 40);
  });

  it('shrinks the sidebar when dragged towards the end of the row', () => {
    const { result } = renderHook(() => useSidebarResize());

    act(() => result.current.onPointerDown(pointerDown(800)));
    act(() => dragTo(830));
    act(() => endDrag());

    expect(setStoredWidth).toHaveBeenCalledWith(DEFAULT_SIDEBAR_WIDTH - 30);
  });

  it('never leaves the supported range while dragging', () => {
    const { result } = renderHook(() => useSidebarResize());

    act(() => result.current.onPointerDown(pointerDown(800)));
    act(() => dragTo(-5000));
    act(() => endDrag());

    expect(setStoredWidth).toHaveBeenCalledWith(MAX_SIDEBAR_WIDTH);
  });

  it('ignores pointer moves that are not part of a drag', () => {
    renderHook(() => useSidebarResize());

    act(() => dragTo(100));
    act(() => endDrag());

    expect(setStoredWidth).not.toHaveBeenCalled();
  });

  it('resizes with the horizontal arrow keys', () => {
    const { result } = renderHook(() => useSidebarResize());

    act(() => result.current.onKeyDown(arrowKey('ArrowLeft')));
    expect(setStoredWidth).toHaveBeenCalledWith(DEFAULT_SIDEBAR_WIDTH + 10);

    act(() => result.current.onKeyDown(arrowKey('ArrowRight')));
    expect(setStoredWidth).toHaveBeenLastCalledWith(DEFAULT_SIDEBAR_WIDTH - 10);
  });

  it('leaves other keys to the browser', () => {
    const preventDefault = jest.fn();
    const { result } = renderHook(() => useSidebarResize());

    act(() => result.current.onKeyDown(arrowKey('ArrowUp', preventDefault)));

    expect(setStoredWidth).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('applies the committed width to the sidebar node', () => {
    const { result } = renderHook(() => useSidebarResize());
    const node = document.createElement('div');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current.sidebarRef as any).current = node;

    act(() => result.current.onPointerDown(pointerDown(800)));
    act(() => dragTo(770));
    // Mid-drag the write is coalesced onto an animation frame; releasing lands the final position
    // regardless of whether that frame has run.
    act(() => endDrag());

    expect(node.style.flexBasis).toBe(`${DEFAULT_SIDEBAR_WIDTH + 30}px`);
  });
});
