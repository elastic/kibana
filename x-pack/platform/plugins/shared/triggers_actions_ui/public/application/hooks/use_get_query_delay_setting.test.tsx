/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { waitFor, renderHook } from '@testing-library/react';
import { useGetQueryDelaySettings } from './use_get_query_delay_settings';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

jest.mock('../lib/rule_api/get_query_delay_settings', () => ({
  getQueryDelaySettings: jest.fn(),
}));

const { getQueryDelaySettings } = jest.requireMock('../lib/rule_api/get_query_delay_settings');

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useGetQueryDelaySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call getQueryDelaySettings', async () => {
    renderHook(() => useGetQueryDelaySettings({ enabled: true }), {
      wrapper,
    });

    await waitFor(() => {
      expect(getQueryDelaySettings).toHaveBeenCalled();
    });
  });

  it('should return isError = true if api fails', async () => {
    getQueryDelaySettings.mockRejectedValue('This is an error.');

    const { result } = renderHook(() => useGetQueryDelaySettings({ enabled: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
