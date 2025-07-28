/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useBulkDisable } from './use_bulk_disable';
import { bulkDisableScheduledReports } from '../apis/bulk_disable_scheduled_reports';
import { testQueryClient } from '../test_utils/test_query_client';
import { useKibana } from '@kbn/reporting-public';

jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../apis/bulk_disable_scheduled_reports', () => ({
  bulkDisableScheduledReports: jest.fn(),
}));

describe('useBulkDisable', () => {
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

  it('calls bulkDisableScheduledReports with correct arguments', async () => {
    (bulkDisableScheduledReports as jest.Mock).mockResolvedValueOnce({
      scheduled_report_ids: ['random_schedule_report_1'],
      errors: [],
      total: 1,
    });

    const { result } = renderHook(() => useBulkDisable(), {
      wrapper,
    });

    result.current.mutate({ ids: ['random_schedule_report_1'] });

    await waitFor(() => {
      expect(bulkDisableScheduledReports).toBeCalledWith({
        http,
        ids: ['random_schedule_report_1'],
      });
      expect(result.current.data).toEqual({
        scheduled_report_ids: ['random_schedule_report_1'],
        errors: [],
        total: 1,
      });
      expect(toasts.addSuccess).toHaveBeenCalled();
    });
  });

  it('throws error', async () => {
    (bulkDisableScheduledReports as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useBulkDisable(), {
      wrapper,
    });

    result.current.mutate({ ids: [] });

    await waitFor(() => {
      expect(bulkDisableScheduledReports).toBeCalledWith({
        http,
        ids: [],
      });
      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
