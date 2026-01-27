/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGetReportingHealthQuery } from './use_get_reporting_health_query';
import * as getReportingHealthModule from '../apis/get_reporting_health';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { HttpSetup } from '@kbn/core-http-browser';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

jest.mock('../apis/get_reporting_health', () => ({
  getReportingHealth: jest.fn(),
}));

const mockHttpService = httpServiceMock.create() as unknown as HttpSetup;

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useGetReportingHealthQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getReportingHealth with correct arguments', async () => {
    const mockHealth = { status: 'ok' };
    (getReportingHealthModule.getReportingHealth as jest.Mock).mockResolvedValue(mockHealth);

    const { result } = renderHook(() => useGetReportingHealthQuery({ http: mockHttpService }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy();
      expect(result.current.data).toBeDefined();
    });

    expect(getReportingHealthModule.getReportingHealth).toHaveBeenCalledWith({
      http: mockHttpService,
    });
    expect(result.current.data).toEqual(mockHealth);
  });
});
