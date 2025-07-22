/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { testQueryClient } from '../test_utils/test_query_client';
import { useGetReportingHealthQuery } from './use_get_reporting_health_query';
import * as getReportingHealthModule from '../apis/get_reporting_health';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { HttpSetup } from '@kbn/core-http-browser';

jest.mock('../apis/get_reporting_health', () => ({
  getReportingHealth: jest.fn(),
}));

const mockHttpService = httpServiceMock.create() as unknown as HttpSetup;

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

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

    await waitFor(() => result.current.isSuccess);

    expect(getReportingHealthModule.getReportingHealth).toHaveBeenCalledWith({
      http: mockHttpService,
    });
    expect(result.current.data).toEqual(mockHealth);
  });
});
