/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { renderHook, waitFor } from '@testing-library/react';
import { getScheduledReportsList } from '../apis/get_scheduled_reports_list';
import { useGetScheduledList } from './use_get_scheduled_list';
import { useKibana } from '@kbn/reporting-public';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../apis/get_scheduled_reports_list', () => ({
  getScheduledReportsList: jest.fn(),
}));

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useGetScheduledList', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http,
      },
    });
  });

  it('calls getScheduledList with correct arguments', async () => {
    (getScheduledReportsList as jest.Mock).mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useGetScheduledList({}), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: [] });
    });

    expect(getScheduledReportsList).toBeCalledWith({
      http,
      page: 1,
      perPage: 50,
    });
  });
});
