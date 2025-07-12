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
import { DEFAULTS, useFetchAnonymizationFields } from './use_fetch_anonymization_fields';
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

describe('useFetchAnonymizationFields', () => {
  (useAssistantContext as jest.Mock).mockReturnValue({
    http,
    assistantAvailability: {
      isAssistantEnabled: true,
    },
  });
  it(`should make http request to fetch anonymization fields with default params`, async () => {
    renderHook(() => useFetchAnonymizationFields(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/anonymization_fields/_find',
        {
          method: 'GET',
          query: {
            page: DEFAULTS.page + 1,
            per_page: DEFAULTS.perPage,
            sort_field: DEFAULTS.sortField,
            sort_order: DEFAULTS.sortOrder,
          },
          version: API_VERSIONS.public.v1,
          signal: undefined,
        }
      );

      expect(http.fetch).toHaveBeenCalled();
    });
  });

  it(`should make http request to fetch anonymization fields with custom params`, async () => {
    const page = 1;
    const perPage = 20;
    const sortField = 'custom_field';
    const sortOrder = 'desc';
    const filter = 'test_filter';

    renderHook(
      () =>
        useFetchAnonymizationFields({
          page,
          perPage,
          sortField,
          sortOrder,
          filter,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/anonymization_fields/_find',
        {
          method: 'GET',
          query: {
            page: page + 1, // EUI uses 0-based index, while API uses 1-based index
            per_page: perPage,
            sort_field: sortField,
            sort_order: sortOrder,
            filter: `field: ${filter}*`,
          },
          version: API_VERSIONS.public.v1,
          signal: undefined,
        }
      );

      expect(http.fetch).toHaveBeenCalled();
    });
  });
});
