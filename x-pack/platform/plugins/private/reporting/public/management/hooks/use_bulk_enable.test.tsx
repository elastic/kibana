/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { renderHook, waitFor } from '@testing-library/react';
import { useBulkEnable } from './use_bulk_enable';
import { bulkEnableScheduledReports } from '../apis/bulk_enable_scheduled_reports';
import { useKibana } from '@kbn/reporting-public';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../apis/bulk_enable_scheduled_reports', () => ({
  bulkEnableScheduledReports: jest.fn(),
}));

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useBulkEnable', () => {
  const http = httpServiceMock.createStartContract();
  const toasts = notificationServiceMock.createStartContract().toasts;

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

  it('calls bulkEnableScheduledReports with correct arguments', async () => {
    (bulkEnableScheduledReports as jest.Mock).mockResolvedValueOnce({
      scheduled_report_ids: ['random_schedule_report_1'],
      errors: [],
      total: 1,
    });

    const { result } = renderHook(() => useBulkEnable(), {
      wrapper,
    });

    result.current.mutate({ ids: ['random_schedule_report_1'] });

    await waitFor(() => {
      expect(bulkEnableScheduledReports).toBeCalledWith({
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
    (bulkEnableScheduledReports as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useBulkEnable(), {
      wrapper,
    });

    result.current.mutate({ ids: [] });

    await waitFor(() => {
      expect(bulkEnableScheduledReports).toBeCalledWith({
        http,
        ids: [],
      });
      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
