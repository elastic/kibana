/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useDefaultDataFormat } from './use_default_data_format';

const mockUseKibana = useKibana as jest.Mock;

function setup(services: Record<string, unknown>) {
  mockUseKibana.mockReturnValue({ services });
}

describe('useDefaultDataFormat', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('serverless', () => {
    it('returns otel + isResolved:true for observability project type', () => {
      setup({ cloud: { serverless: { projectType: 'observability' } } });
      const { result } = renderHook(() => useDefaultDataFormat());
      expect(result.current).toEqual({ defaultFormat: 'otel', isResolved: true });
    });

    it('returns ecs + isResolved:true for non-observability project type', () => {
      setup({ cloud: { serverless: { projectType: 'security' } } });
      const { result } = renderHook(() => useDefaultDataFormat());
      expect(result.current).toEqual({ defaultFormat: 'ecs', isResolved: true });
    });
  });

  describe('stateful — spaces absent', () => {
    it('returns ecs + isResolved:true when spaces service is not available', () => {
      setup({ cloud: {} });
      const { result } = renderHook(() => useDefaultDataFormat());
      expect(result.current).toEqual({ defaultFormat: 'ecs', isResolved: true });
    });
  });

  describe('stateful — spaces present', () => {
    it('returns ecs + isResolved:false before the space fetch resolves', async () => {
      let resolve!: (space: { solution?: string }) => void;
      const pendingPromise = new Promise<{ solution?: string }>((res) => {
        resolve = res;
      });
      setup({ cloud: {}, spaces: { getActiveSpace: () => pendingPromise } });

      const { result, unmount } = renderHook(() => useDefaultDataFormat());
      expect(result.current).toEqual({ defaultFormat: 'ecs', isResolved: false });

      // Resolve and unmount inside act so the pending state update doesn't fire after cleanup.
      await act(async () => {
        resolve({});
        await pendingPromise;
      });
      unmount();
    });

    it('returns otel + isResolved:true for oblt solution', async () => {
      setup({
        cloud: {},
        spaces: { getActiveSpace: () => Promise.resolve({ solution: 'oblt' }) },
      });
      const { result } = renderHook(() => useDefaultDataFormat());
      await act(async () => {});
      expect(result.current).toEqual({ defaultFormat: 'otel', isResolved: true });
    });

    it('returns ecs + isResolved:true for non-oblt solution', async () => {
      setup({
        cloud: {},
        spaces: { getActiveSpace: () => Promise.resolve({ solution: 'es' }) },
      });
      const { result } = renderHook(() => useDefaultDataFormat());
      await act(async () => {});
      expect(result.current).toEqual({ defaultFormat: 'ecs', isResolved: true });
    });

    it('returns ecs + isResolved:true when space has no solution field', async () => {
      setup({
        cloud: {},
        spaces: { getActiveSpace: () => Promise.resolve({}) },
      });
      const { result } = renderHook(() => useDefaultDataFormat());
      await act(async () => {});
      expect(result.current).toEqual({ defaultFormat: 'ecs', isResolved: true });
    });

    it('returns ecs + isResolved:true when the space fetch rejects', async () => {
      setup({
        cloud: {},
        spaces: { getActiveSpace: () => Promise.reject(new Error('fetch failed')) },
      });
      const { result } = renderHook(() => useDefaultDataFormat());
      await act(async () => {});
      expect(result.current).toEqual({ defaultFormat: 'ecs', isResolved: true });
    });
  });
});
