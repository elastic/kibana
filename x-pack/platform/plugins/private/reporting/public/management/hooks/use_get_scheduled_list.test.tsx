/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { getScheduledReportsList } from '../apis/get_scheduled_reports_list';
import { useGetScheduledList } from './use_get_scheduled_list';
import { testQueryClient } from '../test_utils/test_query_client';
import { useKibana } from '@kbn/reporting-public';

vi.mock('@kbn/reporting-public', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../apis/get_scheduled_reports_list', () => {
      const mocked = {
      getScheduledReportsList: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useGetScheduledList', () => {
  const http = httpServiceMock.createStartContract();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue({
      services: {
        http,
      },
    });
  });

  it('calls getScheduledList with correct arguments', async () => {
    (getScheduledReportsList as Mock).mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useGetScheduledList({}), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: [] });
    });

    expect(getScheduledReportsList).toHaveBeenCalledWith({
      http,
      page: 1,
      perPage: 50,
    });
  });
});
