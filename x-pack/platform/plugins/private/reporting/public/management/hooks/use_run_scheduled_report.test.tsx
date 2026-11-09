/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useRunScheduledReport } from './use_run_scheduled_report';
import { runScheduledReport } from '../apis/run_scheduled_report';
import { testQueryClient } from '../test_utils/test_query_client';
import { useKibana } from '@kbn/reporting-public';

jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../apis/run_scheduled_report', () => ({
  runScheduledReport: jest.fn(),
}));

describe('useRunScheduledReport', () => {
  const http = httpServiceMock.createStartContract();
  const toasts = notificationServiceMock.createStartContract().toasts;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http,
        notifications: {
          toasts,
        },
      },
    });
    jest.clearAllMocks();
  });

  it('calls runScheduledReport with correct arguments', async () => {
    (runScheduledReport as jest.Mock).mockResolvedValueOnce({
      id: 'random_schedule_report_1',
    });

    const { result } = renderHook(() => useRunScheduledReport(), {
      wrapper,
    });

    result.current.mutate({ id: 'random_schedule_report_1' });

    await waitFor(() => {
      expect(runScheduledReport).toHaveBeenCalledWith({
        http,
        id: 'random_schedule_report_1',
      });
      expect(result.current.data).toEqual({
        id: 'random_schedule_report_1',
      });
      expect(toasts.addSuccess).toHaveBeenCalled();
    });
  });

  it('throws error', async () => {
    (runScheduledReport as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useRunScheduledReport(), {
      wrapper,
    });

    result.current.mutate({ id: 'random_schedule_report_1' });

    await waitFor(() => {
      expect(runScheduledReport).toHaveBeenCalledWith({
        http,
        id: 'random_schedule_report_1',
      });
      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
