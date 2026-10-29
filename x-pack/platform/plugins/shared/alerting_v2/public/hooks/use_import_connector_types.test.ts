/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useImportConnectorTypes } from './use_import_connector_types';

const mockFetchConnectorTypes = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ get: jest.fn() }),
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/alerts-ui-shared/src/common/apis', () => ({
  fetchConnectorTypes: (...args: unknown[]) => mockFetchConnectorTypes(...args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useImportConnectorTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks for the connector types with the importAlerts feature', async () => {
    mockFetchConnectorTypes.mockResolvedValue([{ id: '.datadog', name: 'Datadog' }]);
    const { result } = renderHook(() => useImportConnectorTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual([{ id: '.datadog', name: 'Datadog' }]));
    expect(mockFetchConnectorTypes).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'importAlerts' })
    );
  });

  it('reports a failed load', async () => {
    mockFetchConnectorTypes.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useImportConnectorTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
