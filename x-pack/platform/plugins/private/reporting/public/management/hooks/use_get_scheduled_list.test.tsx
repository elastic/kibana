/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { getScheduledReportsList } from '../apis/get_scheduled_reports_list';
import { useGetScheduledList } from './use_get_scheduled_list';
import { testQueryClient } from '../test_utils/test_query_client';

jest.mock('../apis/get_scheduled_reports_list', () => ({
  getScheduledReportsList: jest.fn(),
}));

describe('useGetScheduledList', () => {
  const http = httpServiceMock.createStartContract();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getScheduledList with correct arguments', async () => {
    (getScheduledReportsList as jest.Mock).mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useGetScheduledList({ http, index: 1, size: 10 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: [] });
    });

    expect(getScheduledReportsList).toBeCalledWith({
      http,
      index: 1,
      size: 10,
    });
  });
});
