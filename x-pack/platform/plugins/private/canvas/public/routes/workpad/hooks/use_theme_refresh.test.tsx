/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { BehaviorSubject } from 'rxjs';
import type { CoreTheme } from '@kbn/core/public';
import { coreServices } from '../../../services/kibana_services';
import { useThemeRefresh } from './use_theme_refresh';

const mockDispatch = vi.fn();
const refreshAction = { type: 'fetchAllRenderables' };

const lightTheme: CoreTheme = { darkMode: false, name: 'borealis' };
const darkTheme: CoreTheme = { darkMode: true, name: 'borealis' };

vi.mock('react-redux-v7', () => {
  const mocked = {
    useDispatch: () => mockDispatch,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../state/actions/elements', () => {
  const mocked = {
    fetchAllRenderables: () => refreshAction,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../services/kibana_services', () => {
  const { BehaviorSubject: MockBehaviorSubject } = require('rxjs');
  return {
    coreServices: {
      theme: {
        theme$: new MockBehaviorSubject({ darkMode: false, name: 'borealis' }),
      },
    },
  };
});

const theme$ = coreServices.theme.theme$ as BehaviorSubject<CoreTheme>;

describe('useThemeRefresh', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    theme$.next(lightTheme);
  });

  test('does not refresh on the initial theme emission', () => {
    renderHook(() => useThemeRefresh());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('refreshes renderables when dark mode changes', () => {
    renderHook(() => useThemeRefresh());

    theme$.next(darkTheme);

    expect(mockDispatch).toHaveBeenCalledWith(refreshAction);
  });

  test('does not refresh when irrelevant theme values change', () => {
    renderHook(() => useThemeRefresh());

    theme$.next({ ...lightTheme });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useThemeRefresh());

    unmount();
    theme$.next(darkTheme);

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
