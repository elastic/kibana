/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFetchAlertSummary } from './use_fetch_alert_summary';
import { useAssistantContext } from '../../..';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

jest.mock('../../..', () => ({
  useAssistantContext: jest.fn(),
}));
const args = {
  alertId: '12345',
  connectorId: '67890',
};
const createWrapper = () => {
  const queryClient = new QueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
const mockAlertSummary = {
  summary: "CPU utilization for host 'prod-web-01' exceeded 90% threshold, reaching 95%.",
};
describe('useFetchAlertSummary', () => {
  const mockHttp = {
    fetch: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockReturnValue({
      http: mockHttp,
      assistantAvailability: {
        isAssistantEnabled: true,
      },
    });
  });

  it('should fetch alert summary successfully', async () => {
    mockHttp.fetch.mockResolvedValue({
      data: [mockAlertSummary],
      page: 1,
      perPage: 1,
      total: 1,
      prompt: 'Generate an alert summary!',
    });

    const { result } = renderHook(() => useFetchAlertSummary(args), {
      wrapper: createWrapper(),
    });
    expect(mockHttp.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
      })
    );
    await waitFor(() => {
      expect(result.current.data.data).toHaveLength(1);
      expect(result.current.data.data[0].summary).toEqual(mockAlertSummary.summary);
    });
  });
});
