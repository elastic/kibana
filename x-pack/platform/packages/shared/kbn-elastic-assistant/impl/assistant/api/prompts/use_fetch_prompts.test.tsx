/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import { useFetchPrompts } from './use_fetch_prompts';
import { useAssistantContext } from '../../../assistant_context';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

(useAssistantContext as jest.Mock).mockReturnValue({
  http,
  assistantAvailability: {
    isAssistantEnabled: true,
  },
});
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

    await waitFor(() => {
      expect(http.fetch).toHaveBeenCalledWith('/api/security_ai_assistant/prompts/_find', {
        method: 'GET',
        query: {
          page: 1,
          per_page: 1000,
          filter: 'consumer:*',
        },
        version: API_VERSIONS.public.v1,
        signal: undefined,
      });

      expect(http.fetch).toHaveBeenCalled();
    });
  });
});
