/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH } from '@kbn/alerting-v2-constants';
import type { ActionPolicyRoutingTagsResponse } from '@kbn/alerting-v2-schemas';
import { createQueryClientWrapper } from '../../test_utils';
import { useFetchActionPolicyRoutingTags } from './use_fetch_action_policy_routing_tags';

const response = (tags: string[]): ActionPolicyRoutingTagsResponse => ({
  items: tags.map((tag) => ({
    tag,
    policy_count: 1,
    policies: [{ id: `${tag}-policy`, name: `${tag} policy` }],
  })),
  total_tags: tags.length,
  is_truncated: false,
});

describe('useFetchActionPolicyRoutingTags', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  it('fetches the routing tags and returns the whole response', async () => {
    http.get.mockResolvedValue(response(['rna', 'sre']));

    const { result } = renderHook(() => useFetchActionPolicyRoutingTags({ http }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(
      ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH,
      { query: { search: undefined } }
    );
    expect(result.current.data).toEqual(response(['rna', 'sre']));
  });

  it('forwards a search prefix', async () => {
    http.get.mockResolvedValue(response(['rna']));

    const { result } = renderHook(() => useFetchActionPolicyRoutingTags({ http, search: 'rn' }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(
      ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH,
      { query: { search: 'rn' } }
    );
  });

  it('treats empty and whitespace-only search as an omitted query param', async () => {
    http.get.mockResolvedValue(response(['rna']));

    const wrapper = createQueryClientWrapper();
    const { result: omitted } = renderHook(() => useFetchActionPolicyRoutingTags({ http }), {
      wrapper,
    });
    await waitFor(() => expect(omitted.current.isSuccess).toBe(true));

    const { result: whitespace } = renderHook(
      () => useFetchActionPolicyRoutingTags({ http, search: '   ' }),
      { wrapper }
    );
    await waitFor(() => expect(whitespace.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('uses separate cache entries for different searches', async () => {
    http.get.mockResolvedValueOnce(response(['rna'])).mockResolvedValueOnce(response(['sre']));

    const wrapper = createQueryClientWrapper();
    const { result: first } = renderHook(
      () => useFetchActionPolicyRoutingTags({ http, search: 'rn' }),
      { wrapper }
    );
    const { result: second } = renderHook(
      () => useFetchActionPolicyRoutingTags({ http, search: 'sr' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(first.current.data).toEqual(response(['rna']));
      expect(second.current.data).toEqual(response(['sre']));
    });
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('reports an error without retrying when the route fails', async () => {
    http.get.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useFetchActionPolicyRoutingTags({ http }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeUndefined();
  });
});
