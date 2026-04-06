/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchRule } from './use_fetch_rule_http';

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchRule', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not request when ruleId is undefined', () => {
    const { result } = renderHook(() => useFetchRule({ http, ruleId: undefined }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('GETs the alerting v2 rule by id', async () => {
    const ruleId = 'my-rule';
    const ruleBody = { id: ruleId, metadata: { name: 'Rule' } };
    http.get.mockResolvedValue(ruleBody);

    const { result } = renderHook(() => useFetchRule({ http, ruleId }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(
      `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}`
    );
    expect(result.current.data).toEqual(ruleBody);
  });
});
