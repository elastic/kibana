/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { useAppDependencies } from '../app_dependencies';

import { useGetHistogramsForFields } from './use_get_histograms_for_fields';

jest.mock('../app_dependencies');

describe('useGetHistogramsForFields', () => {
  const { http } = useAppDependencies();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encodes reserved characters in the data view title path segment', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const dataViewTitle = 'logs/app#foo';

    renderHook(
      () =>
        useGetHistogramsForFields(
          dataViewTitle,
          [{ fieldName: 'message' }],
          '*',
          undefined,
          undefined,
          true
        ),
      { wrapper }
    );

    await waitFor(() => {
      expect(http.post).toHaveBeenCalled();
    });

    expect(http.post).toHaveBeenCalledWith(
      '/internal/transform/field_histograms/logs%2Fapp%23foo',
      expect.objectContaining({
        version: '1',
      })
    );
  });
});
