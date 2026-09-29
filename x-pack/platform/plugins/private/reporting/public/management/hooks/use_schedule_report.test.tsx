/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { testQueryClient } from '../test_utils/test_query_client';
import { useScheduleReport } from './use_schedule_report';
import * as scheduleReportApi from '../apis/schedule_report';
import type { HttpSetup } from '@kbn/core/public';

const mockHttp = {} as HttpSetup;

vi.mock('../apis/schedule_report', () => {
  const mocked = {
    scheduleReport: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

describe('useScheduleReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call scheduleReport with correct arguments and return data', async () => {
    const mockResponse = { id: 'report-123' };
    (scheduleReportApi.scheduleReport as Mock).mockResolvedValue(mockResponse);

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
