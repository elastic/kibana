/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { createQueryClientWrapper } from '../../test_utils';
import { useFetchRuleTags } from './use_fetch_rule_tags';

describe('useFetchRuleTags', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
  });

  it('fetches the most-used tags when search is omitted', async () => {
    http.get.mockResolvedValue({ tags: ['cpu', 'memory'] });

    const { result } = renderHook(() => useFetchRuleTags({ http }), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/tags`, {
      query: { search: undefined },
    });
    expect(result.current.data).toEqual(['cpu', 'memory']);
  });

  it('forwards a search prefix in the query', async () => {
    http.get.mockResolvedValue({ tags: ['production'] });

    const { result } = renderHook(() => useFetchRuleTags({ http, search: 'pro' }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/tags`, {
      query: { search: 'pro' },
    });
    expect(result.current.data).toEqual(['production']);
  });

  it('treats an empty search string as an omitted query param', async () => {
    http.get.mockResolvedValue({ tags: ['cpu'] });

    const { result } = renderHook(() => useFetchRuleTags({ http, search: '' }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/tags`, {
      query: { search: undefined },
    });
  });

  it('uses separate cache entries for different search values', async () => {
    http.get.mockResolvedValueOnce({ tags: ['prod'] }).mockResolvedValueOnce({ tags: ['staging'] });

    const wrapper = createQueryClientWrapper();
    const { result: first } = renderHook(() => useFetchRuleTags({ http, search: 'pro' }), {
      wrapper,
    });
    const { result: second } = renderHook(() => useFetchRuleTags({ http, search: 'sta' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(first.current.data).toEqual(['prod']);
      expect(second.current.data).toEqual(['staging']);
    });

    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
