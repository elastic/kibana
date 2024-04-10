/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import {
  UseFetchAnonymizationFieldsParams,
  useFetchAnonymizationFields,
} from './use_fetch_anonymization_fields';
import { HttpSetup } from '@kbn/core-http-browser';

const statusResponse = { assistantModelEvaluation: true, assistantStreamingEnabled: false };

const http = {
  fetch: jest.fn().mockResolvedValue(statusResponse),
} as unknown as HttpSetup;

const defaultProps = { http } as unknown as UseFetchAnonymizationFieldsParams;

const createWrapper = () => {
  const queryClient = new QueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFetchAnonymizationFields', () => {
  it(`should make http request to fetch anonymization fields`, async () => {
    renderHook(() => useFetchAnonymizationFields(defaultProps), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useFetchAnonymizationFields(defaultProps));
      await waitForNextUpdate();
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/elastic_assistant/anonymization_fields/_find',
        {
          method: 'GET',
          query: {
            page: 1,
            per_page: 1000,
          },
          version: '2023-10-31',
          signal: undefined,
        }
      );

      expect(defaultProps.http.fetch).toHaveBeenCalled();
    });
  });
});
