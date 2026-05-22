/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, buildRespondToActionUrl } from '@kbn/inbox-common';
import { queryKeys } from '../query_keys';
import { useRespondToInboxAction } from './use_respond_to_inbox_action';

jest.mock('@kbn/kibana-react-plugin/public');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const createWrapper = (queryClient: QueryClient = createClient()): FC<PropsWithChildren<{}>> => {
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useRespondToInboxAction', () => {
  let httpPost: jest.Mock;

  beforeEach(() => {
    httpPost = jest.fn().mockResolvedValue({ ok: true });
    useKibanaMock.mockReturnValue({
      services: { http: { post: httpPost } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('POSTs to the parameterized respond URL pinned to the v1 internal API version', async () => {
    const { result } = renderHook(() => useRespondToInboxAction(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        sourceApp: 'workflows',
        sourceId: 'exec-123',
        input: { approved: true },
      });
    });

    expect(httpPost).toHaveBeenCalledTimes(1);
    const [url, options] = httpPost.mock.calls[0];
    expect(url).toBe(buildRespondToActionUrl('workflows', 'exec-123'));
    expect(options.version).toBe(API_VERSIONS.internal.v1);
    expect(JSON.parse(options.body)).toEqual({ input: { approved: true } });
  });

  it('url-encodes the source_app and source_id path segments', async () => {
    const { result } = renderHook(() => useRespondToInboxAction(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        sourceApp: 'workflows',
        sourceId: 'wf:exec with slashes/123',
        input: {},
      });
    });

    const [url] = httpPost.mock.calls[0];
    expect(url).toContain('wf%3Aexec%20with%20slashes%2F123');
  });

  it('surfaces HTTP errors via the mutation error state', async () => {
    httpPost.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useRespondToInboxAction(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          sourceApp: 'workflows',
          sourceId: 'exec-123',
          input: {},
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(String(result.current.error)).toMatch(/network down/);
  });

  it('invalidates the inbox actions list on success so responded items drop off the UI', async () => {
    // Regression: the respond mutation must invalidate the list query,
    // otherwise the responded action keeps rendering until the user
    // manually refreshes.
    const queryClient = createClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToInboxAction(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        sourceApp: 'workflows',
        sourceId: 'exec-123',
        input: { approved: true },
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.actions.all,
    });
  });

  it('does not invalidate the inbox actions list when the respond call fails', async () => {
    // If the server rejects the respond the action is still pending, so the
    // cache must stay put — otherwise we'd refetch and mask a real failure
    // with an optimistic removal.
    httpPost.mockRejectedValueOnce(new Error('boom'));
    const queryClient = createClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToInboxAction(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          sourceApp: 'workflows',
          sourceId: 'exec-123',
          input: {},
        });
      } catch {
        // expected
      }
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
