/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { testQueryClient } from '../test_utils/test_query_client';
import { useScheduleReport } from './use_schedule_report';
import * as scheduleReportApi from '../apis/schedule_report';
import { HttpSetup } from '@kbn/core/public';

const mockHttp = {} as HttpSetup;

jest.mock('../apis/schedule_report', () => ({
  scheduleReport: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

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

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy();
      expect(result.current.data).toBeDefined();
    });

    expect(scheduleReportApi.scheduleReport).toHaveBeenCalledWith({
      http: mockHttp,
      params: { reportTypeId: 'printablePdfV2', jobParams: '' },
    });
    expect(result.current.data).toEqual(mockResponse);
  });
});
