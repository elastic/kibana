/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchRule } from './use_fetch_rule';

const mockRule = { id: 'r1', metadata: { name: 'Rule 1' } } as unknown as RuleResponse;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchRule', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('fetches a rule by id via http GET', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValueOnce(mockRule);

    const { result } = renderHook(() => useFetchRule({ id: 'r1', http }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/r1`, {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data).toEqual(mockRule);
  });

  it('does not fetch when id is undefined', () => {
    const http = httpServiceMock.createStartContract();
    const { result } = renderHook(() => useFetchRule({ id: undefined, http }), { wrapper });
    expect(http.get).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
