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
import { useUpdateScheduleReport } from './use_update_schedule_report';
import { updateScheduleReport } from '../apis/update_schedule_report';
import type { HttpSetup } from '@kbn/core/public';

const mockHttp = {} as HttpSetup;

vi.mock('../apis/update_schedule_report', () => {
      const mocked = {
      updateScheduleReport: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

describe('useUpdateScheduleReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call useScheduleReport with correct arguments and return data', async () => {
    const mockResponse = { id: 'report-123', title: 'Updated Report' };
    (updateScheduleReport as Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUpdateScheduleReport({ http: mockHttp }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ reportId: 'report-123', title: 'Updated Report' });
    });

    await waitFor(() => result.current.isSuccess);

    expect(updateScheduleReport).toHaveBeenCalledWith({
      http: mockHttp,
      params: { reportId: 'report-123', title: 'Updated Report' },
    });
    expect(result.current.data).toEqual(mockResponse);
  });
});
