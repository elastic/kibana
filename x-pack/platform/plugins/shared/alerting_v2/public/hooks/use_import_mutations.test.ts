/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDeleteImport } from './use_delete_import';
import { useSetImportEnabled } from './use_set_import_enabled';

const mockUpdateImport = jest.fn();
const mockDeleteImport = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('@kbn/core-di-browser', () => {
  const { ImportsApi: ActualImportsApi } = jest.requireActual('../services/imports_api');
  return {
    useService: (token: unknown) => {
      if (token === ActualImportsApi) {
        return { updateImport: mockUpdateImport, deleteImport: mockDeleteImport };
      }
      if (token === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('import mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSetImportEnabled', () => {
    it('patches enabled and toasts with the import name', async () => {
      mockUpdateImport.mockResolvedValue({ id: 'import-1', name: 'Datadog', enabled: false });
      const { result } = renderHook(() => useSetImportEnabled(), { wrapper: createWrapper() });

      result.current.mutate({ id: 'import-1', enabled: false });

      await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledWith('Datadog disabled'));
      expect(mockUpdateImport).toHaveBeenCalledWith('import-1', { enabled: false });
    });

    it('shows an error toast when the update fails', async () => {
      mockUpdateImport.mockRejectedValue(new Error('nope'));
      const { result } = renderHook(() => useSetImportEnabled(), { wrapper: createWrapper() });

      result.current.mutate({ id: 'import-1', enabled: true });

      await waitFor(() => expect(mockAddError).toHaveBeenCalled());
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  describe('useDeleteImport', () => {
    it('deletes with the resources flag and toasts', async () => {
      mockDeleteImport.mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteImport(), { wrapper: createWrapper() });

      result.current.mutate({ id: 'import-1', deleteResources: true });

      await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledWith('Import deleted'));
      expect(mockDeleteImport).toHaveBeenCalledWith('import-1', true);
    });

    it('shows an error toast when deleting fails', async () => {
      mockDeleteImport.mockRejectedValue(new Error('nope'));
      const { result } = renderHook(() => useDeleteImport(), { wrapper: createWrapper() });

      result.current.mutate({ id: 'import-1', deleteResources: false });

      await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    });
  });
});
