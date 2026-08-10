/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useGoBack } from './use_go_back';

const mockPush = jest.fn();
const mockGoBack = jest.fn();
let mockLocationState: Record<string, unknown> | null = null;
let mockHistoryLength = 2;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockPush, goBack: mockGoBack, length: mockHistoryLength }),
  useLocation: () => ({ state: mockLocationState }),
}));

const createMouseEvent = () => ({ preventDefault: jest.fn() } as unknown as React.MouseEvent);

describe('useGoBack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = null;
    mockHistoryLength = 2;
    sessionStorage.clear();
  });

  it('pushes to fallback path when location state has no fromHistory flag', () => {
    const { result } = renderHook(() => useGoBack('/history'));
    const event = createMouseEvent();

    act(() => {
      result.current(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/history');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('calls history.goBack() when location state has fromHistory: true', () => {
    mockLocationState = { fromHistory: true };
    const { result } = renderHook(() => useGoBack('/history'));
    const event = createMouseEvent();

    act(() => {
      result.current(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('pushes to fallback path when fromHistory is false', () => {
    mockLocationState = { fromHistory: false };
    const { result } = renderHook(() => useGoBack('/live_queries'));
    const event = createMouseEvent();

    act(() => {
      result.current(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/live_queries');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('pushes to fallback path after page refresh (fromHistory true but history.length is 1)', () => {
    mockLocationState = { fromHistory: true };
    mockHistoryLength = 1;
    const { result } = renderHook(() => useGoBack('/history'));
    const event = createMouseEvent();

    act(() => {
      result.current(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/history');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('pushes fallback path with query string when provided by caller', () => {
    const { result } = renderHook(() => useGoBack('/history?q=uptime&sources=live'));
    const event = createMouseEvent();

    act(() => {
      result.current(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/history?q=uptime&sources=live');
  });
});
