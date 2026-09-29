/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { useWorkpad } from './use_workpad';
import { spacesService } from '../../../services/kibana_services';

const mockDispatch = vi.fn();
const mockSelector = vi.fn();
const mockResolveWorkpad = vi.fn();
const mockRedirectLegacyUrl = vi.fn();

const workpad = {
  id: 'someworkpad',
  pages: [],
};

const assets = [{ id: 'asset-id' }];

const workpadResponse = {
  ...workpad,
  assets,
};

// Mock the hooks, actions, and services used by the UseWorkpad hook
vi.mock('react-redux-v7', () => {
  const mocked = {
    useDispatch: () => mockDispatch,
    useSelector: () => mockSelector,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../services/canvas_workpad_service', () => {
  const mocked = {
    getCanvasWorkpadService: () => {
      return {
        resolve: mockResolveWorkpad,
      };
    },
  };
  return { ...mocked, default: mocked };
});

spacesService!.ui.redirectLegacyUrl = mockRedirectLegacyUrl;

vi.mock('../../../state/actions/workpad', () => {
  const mocked = {
    setWorkpad: (payload: any) => ({
      type: 'setWorkpad',
      payload,
    }),
  };
  return { ...mocked, default: mocked };
});

describe('useWorkpad', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('fires request to load workpad and dispatches results', async () => {
    const workpadId = 'someworkpad';
    const getRedirectPath = (id: string) => id;
    mockResolveWorkpad.mockResolvedValue({
      outcome: 'exactMatch',
      workpad: workpadResponse,
    });

    const { unmount } = renderHook(() => useWorkpad(workpadId, true, getRedirectPath));

    try {
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(3));

      expect(mockResolveWorkpad).toHaveBeenCalledWith(workpadId);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setAssets', payload: assets });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setWorkpad', payload: workpad });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setZoomScale', payload: 1 });
    } catch (e) {
      throw e;
    } finally {
      unmount();
    }
  });

  test('sets alias id of workpad on a conflict', async () => {
    const workpadId = 'someworkpad';
    const getRedirectPath = (id: string) => id;
    const aliasId = 'someworkpad-alias';
    mockResolveWorkpad.mockResolvedValue({
      outcome: 'conflict',
      workpad: workpadResponse,
      aliasId,
    });

    const { unmount } = renderHook(() => useWorkpad(workpadId, true, getRedirectPath));

    try {
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(3));

      expect(mockResolveWorkpad).toHaveBeenCalledWith(workpadId);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setAssets', payload: assets });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'setWorkpad',
        payload: { ...workpad, aliasId },
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setZoomScale', payload: 1 });
    } catch (e) {
      throw e;
    } finally {
      unmount();
    }
  });

  test('redirects on alias match', async () => {
    const workpadId = 'someworkpad';
    const getRedirectPath = (id: string) => id;
    const aliasId = 'someworkpad-alias';
    mockResolveWorkpad.mockResolvedValue({
      outcome: 'aliasMatch',
      workpad: workpadResponse,
      aliasId,
      aliasPurpose: 'savedObjectConversion',
    });

    const { unmount } = renderHook(() => useWorkpad(workpadId, true, getRedirectPath));
    try {
      await waitFor(() => expect(mockRedirectLegacyUrl).toHaveBeenCalled());
      expect(mockRedirectLegacyUrl).toHaveBeenCalledWith({
        path: `#${aliasId}`,
        aliasPurpose: 'savedObjectConversion',
        objectNoun: 'Workpad',
      });
    } catch (e) {
      throw e;
    } finally {
      unmount();
    }
  });
});
