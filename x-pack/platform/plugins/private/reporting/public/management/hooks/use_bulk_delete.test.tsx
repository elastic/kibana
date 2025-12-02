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
import { useBulkDelete } from './use_bulk_delete';
import { bulkDeleteScheduledReports } from '../apis/bulk_delete_scheduled_reports';
import { testQueryClient } from '../test_utils/test_query_client';
import { useKibana } from '@kbn/reporting-public';

jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../apis/bulk_delete_scheduled_reports', () => ({
  bulkDeleteScheduledReports: jest.fn(),
}));

describe('useBulkDelete', () => {
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

  it('calls bulkDeleteScheduledReports with correct arguments', async () => {
    (bulkDeleteScheduledReports as jest.Mock).mockResolvedValueOnce({
      scheduled_report_ids: ['random_schedule_report_1'],
      errors: [],
      total: 1,
    });

    const { result } = renderHook(() => useBulkDelete(), {
      wrapper,
    });

    result.current.mutate({ ids: ['random_schedule_report_1'] });

    await waitFor(() => {
      expect(bulkDeleteScheduledReports).toBeCalledWith({
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
    (bulkDeleteScheduledReports as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useBulkDelete(), {
      wrapper,
    });

    result.current.mutate({ ids: [] });

    await waitFor(() => {
      expect(bulkDeleteScheduledReports).toBeCalledWith({
        http,
        ids: [],
      });
      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
