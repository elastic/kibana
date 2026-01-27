/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useScheduleReport } from './use_schedule_report';
import * as scheduleReportApi from '../apis/schedule_report';
import type { HttpSetup } from '@kbn/core/public';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const mockHttp = {} as HttpSetup;

jest.mock('../apis/schedule_report', () => ({
  scheduleReport: jest.fn(),
}));

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useScheduleReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call scheduleReport with correct arguments and return data', async () => {
    const mockResponse = { id: 'report-123' };
    (scheduleReportApi.scheduleReport as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useScheduleReport({ http: mockHttp }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ reportTypeId: 'printablePdfV2', jobParams: '' });
    });

    await waitFor(() => result.current.isSuccess);

    expect(scheduleReportApi.scheduleReport).toHaveBeenCalledWith({
      http: mockHttp,
      params: { reportTypeId: 'printablePdfV2', jobParams: '' },
    });
    expect(result.current.data).toEqual(mockResponse);
  });
});
