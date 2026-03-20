/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { useBulkDeleteActiveSources } from './use_bulk_delete_active_sources';
import { BULK_DELETE_API_ROUTE } from '../../../common';

jest.mock('./use_kibana');

const mockHttp = {
  post: jest.fn(),
};

const mockToasts = {
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addDanger: jest.fn(),
  addError: jest.fn(),
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useBulkDeleteActiveSources', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockHttp.post.mockClear();
    mockToasts.addSuccess.mockClear();
    mockToasts.addWarning.mockClear();
    mockToasts.addDanger.mockClear();
    mockToasts.addError.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('successful deletion', () => {
    it('should call the bulk delete API with the correct parameters', async () => {
      mockHttp.post.mockResolvedValue({
        results: [{ id: 'ds-1', success: true, fullyDeleted: true }],
      });

      const onSuccessCallback = jest.fn();

      const { result } = renderHook(() => useBulkDeleteActiveSources(onSuccessCallback), {
        wrapper,
      });

      act(() => {
        result.current.mutate(['ds-1']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockHttp.post).toHaveBeenCalledWith(BULK_DELETE_API_ROUTE, {
        body: JSON.stringify({ ids: ['ds-1'] }),
      });

      expect(onSuccessCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('toast variants', () => {
    it('should show success toast when all data sources are fully deleted', async () => {
      mockHttp.post.mockResolvedValue({
        results: [
          { id: 'ds-1', success: true, fullyDeleted: true },
          { id: 'ds-2', success: true, fullyDeleted: true },
        ],
      });

      const { result } = renderHook(() => useBulkDeleteActiveSources(), { wrapper });

      act(() => {
        result.current.mutate(['ds-1', 'ds-2']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToasts.addSuccess).toHaveBeenCalledTimes(1);
      expect(mockToasts.addWarning).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });

    it('should show warning toast when some data sources are partially deleted', async () => {
      mockHttp.post.mockResolvedValue({
        results: [
          { id: 'ds-1', success: true, fullyDeleted: true },
          { id: 'ds-2', success: true, fullyDeleted: false },
        ],
      });

      const { result } = renderHook(() => useBulkDeleteActiveSources(), { wrapper });

      act(() => {
        result.current.mutate(['ds-1', 'ds-2']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToasts.addWarning).toHaveBeenCalledTimes(1);
      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });

    it('should show danger toast when any data sources fail to delete', async () => {
      mockHttp.post.mockResolvedValue({
        results: [
          { id: 'ds-1', success: true, fullyDeleted: true },
          { id: 'ds-2', success: false, fullyDeleted: false, error: 'Not found' },
        ],
      });

      const { result } = renderHook(() => useBulkDeleteActiveSources(), { wrapper });

      act(() => {
        result.current.mutate(['ds-1', 'ds-2']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToasts.addDanger).toHaveBeenCalledTimes(1);
      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
      expect(mockToasts.addWarning).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show error toast when the API request fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const serverError = { body: { message: 'Internal server error' } };
      mockHttp.post.mockRejectedValue(serverError);

      const { result } = renderHook(() => useBulkDeleteActiveSources(), { wrapper });

      act(() => {
        result.current.mutate(['ds-1']);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToasts.addError).toHaveBeenCalledTimes(1);
      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    });
  });
});
