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
import { useFetchPrompts } from './use_fetch_prompts';
import { HttpSetup } from '@kbn/core-http-browser';
import { useAssistantContext } from '../../../assistant_context';
import { API_VERSIONS, defaultAssistantFeatures } from '@kbn/elastic-assistant-common';

const http = {
  fetch: jest.fn().mockResolvedValue(defaultAssistantFeatures),
} as unknown as HttpSetup;

jest.mock('../../../assistant_context');

const createWrapper = () => {
  const queryClient = new QueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFetchPrompts', () => {
  (useAssistantContext as jest.Mock).mockReturnValue({
    http,
    assistantAvailability: {
      isAssistantEnabled: true,
    },
  });
  it(`should make http request to fetch prompts`, async () => {
    renderHook(() => useFetchPrompts(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useFetchPrompts());
      await waitForNextUpdate();
      expect(http.fetch).toHaveBeenCalledWith('/internal/elastic_assistant/prompts/_find', {
        method: 'GET',
        query: {
          page: 1,
          per_page: 1000,
          filter: 'consumer:*',
        },
        version: API_VERSIONS.internal.v1,
        signal: undefined,
      });

      expect(http.fetch).toHaveBeenCalled();
    });
  });
});
