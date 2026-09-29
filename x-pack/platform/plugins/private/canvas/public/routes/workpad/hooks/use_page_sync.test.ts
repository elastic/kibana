/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { usePageSync } from './use_page_sync';

const mockDispatch = vi.fn();
const mockGetParams = vi.fn();
const mockGetState = vi.fn();

// Mock the hooks and actions used by the UseWorkpad hook
vi.mock('react-redux-v7', () => {
  const mocked = {
    useDispatch: () => mockDispatch,
    useSelector: (selector: any) => selector(mockGetState()),
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const mocked = {
    useParams: () => mockGetParams(),
  };
  return { ...mocked, default: mocked };
});

describe('usePageSync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('dispatches page index to match the pagenumber param', () => {
    const pageParam = '1';
    const state = {
      persistent: {
        workpad: {
          page: 5,
        },
      },
    };

    mockGetParams.mockReturnValue({ pageNumber: pageParam });
    mockGetState.mockReturnValue(state);

    renderHook(() => usePageSync());

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setPage', payload: 0 });
  });

  test('no dispatch if pageNumber matches page index', () => {
    const pageParam = '6'; // Page number 6 is index 5
    const state = {
      persistent: {
        workpad: {
          page: 5,
        },
      },
    };

    mockGetParams.mockReturnValue({ pageNumber: pageParam });
    mockGetState.mockReturnValue(state);

    renderHook(() => usePageSync());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('pageNumber that is NaN does not dispatch', () => {
    const pageParam = 'A';
    const state = {
      persistent: {
        workpad: {
          page: 5,
        },
      },
    };

    mockGetParams.mockReturnValue({ pageNumber: pageParam });
    mockGetState.mockReturnValue(state);

    renderHook(() => usePageSync());

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
