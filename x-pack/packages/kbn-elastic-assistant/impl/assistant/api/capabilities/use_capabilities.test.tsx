/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import { useCapabilities, UseCapabilitiesParams } from './use_capabilities';
import { API_VERSIONS, defaultAssistantFeatures } from '@kbn/elastic-assistant-common';

const http = {
  get: jest.fn().mockResolvedValue(defaultAssistantFeatures),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as UseCapabilitiesParams;

const createWrapper = () => {
  const queryClient = new QueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFetchRelatedCases', () => {
  it(`should make http request to fetch capabilities`, () => {
    renderHook(() => useCapabilities(defaultProps), {
      wrapper: createWrapper(),
    });

    expect(defaultProps.http.get).toHaveBeenCalledWith('/internal/elastic_assistant/capabilities', {
      version: API_VERSIONS.internal.v1,
      signal: new AbortController().signal,
    });
    expect(toasts.addError).not.toHaveBeenCalled();
  });
});
