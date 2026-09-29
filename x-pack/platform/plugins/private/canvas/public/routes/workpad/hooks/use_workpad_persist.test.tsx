/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import crypto from 'crypto';
import { renderHook } from '@testing-library/react';
import { useWorkpadPersist } from './use_workpad_persist';

const mockGetState = vi.fn();
const mockUpdateWorkpad = vi.fn(() => Promise.resolve(null));
const mockUpdateAssets = vi.fn();
const mockUpdate = vi.fn();

const mockNotifyError = vi.fn();

// Mock the hooks and actions used by the UseWorkpad hook
vi.mock('react-redux-v7', () => {
  const mocked = {
    useSelector: (selector: any) => selector(mockGetState()),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../services/canvas_workpad_service', () => {
  const mocked = {
    getCanvasWorkpadService: () => {
      return {
        updateWorkpad: mockUpdateWorkpad,
        updateAssets: mockUpdateAssets,
        update: mockUpdate,
      };
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../services', () => {
  const mocked = {
    useNotifyService: () => ({
      error: mockNotifyError,
    }),
  };
  return { ...mocked, default: mocked };
});

describe('useWorkpadPersist', () => {
  const initialState = {
    persistent: {
      workpad: { id: crypto.randomUUID(), some: 'workpad' },
    },
    assets: {
      asset1: 'some asset',
      asset2: 'other asset',
    },
  };

  beforeEach(() => {
    // create a default state for each test
    mockGetState.mockReturnValue(initialState);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('initial render does not persist state', () => {
    renderHook(useWorkpadPersist);

    expect(mockUpdateWorkpad).not.toHaveBeenCalled();
  });

  test('changes to workpad cause a workpad update', () => {
    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      ...initialState,
      persistent: {
        workpad: { id: crypto.randomUUID(), new: 'workpad' },
      },
    };

    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdateWorkpad).toHaveBeenCalled();
  });

  test('non changes causes no updated', () => {
    const { rerender } = renderHook(useWorkpadPersist);

    rerender();

    expect(mockUpdateWorkpad).not.toHaveBeenCalled();
  });

  test('non write permissions causes no updates', () => {
    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      persistent: {
        workpad: { id: crypto.randomUUID(), new: 'workpad value' },
      },
      transient: {
        canUserWrite: false,
      },
    };

    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdateWorkpad).not.toHaveBeenCalled();
  });
});
