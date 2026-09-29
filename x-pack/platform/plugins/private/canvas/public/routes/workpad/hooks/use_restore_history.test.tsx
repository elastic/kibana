/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useRestoreHistory } from './use_restore_history';
import { encode } from '../route_state';

const mockDispatch = vi.fn();
const mockGetLocation = vi.fn();
const mockGetHistory = vi.fn();

const location = { state: undefined };
const history = { action: 'POP' };

// Mock the hooks and actions
vi.mock('react-redux-v7', () => {
  const mocked = {
    useDispatch: () => mockDispatch,
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const mocked = {
    useLocation: () => mockGetLocation(),
    useHistory: () => mockGetHistory(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../state/actions/workpad', () => {
  const mocked = {
    initializeWorkpad: () => ({ type: 'initialize' }),
  };
  return { ...mocked, default: mocked };
});

describe('useRestoreHistory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('dispatches nothing on initial run', () => {
    mockGetLocation.mockReturnValue(location);
    mockGetHistory.mockReturnValue(history);
    renderHook(() => useRestoreHistory());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('dispatches nothing on a non pop event', () => {
    mockGetLocation.mockReturnValue(location);
    mockGetHistory.mockReturnValue({ action: 'not-pop' });
    const { rerender } = renderHook(() => useRestoreHistory());

    expect(mockDispatch).not.toHaveBeenCalled();

    mockGetLocation.mockReturnValue({ state: encode({ some: 'state' }) });
    rerender();

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('dispatches restore history if state changes on a POP action', () => {
    const oldState = { a: 'a', b: 'b' };
    const newState = { c: 'c', d: 'd' };

    mockGetHistory.mockReturnValue(history);
    mockGetLocation.mockReturnValue({
      state: encode(oldState),
    });

    const { rerender } = renderHook(() => useRestoreHistory());

    mockGetLocation.mockReturnValue({
      state: encode(newState),
    });

    rerender();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'restoreHistory', payload: newState });
  });
});
