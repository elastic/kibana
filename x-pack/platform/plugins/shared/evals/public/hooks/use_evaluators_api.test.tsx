/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { LlmJudgeConfig } from '@kbn/evals-common';
import { queryKeys } from '../query_keys';
import {
  useCreateEvaluator,
  useDeleteEvaluator,
  useEvaluator,
  useEvaluators,
  useUpdateEvaluator,
} from './use_evaluators_api';

const JUDGE: LlmJudgeConfig = {
  prompt: 'Rate {{{agent_response}}}',
  system_prompt: 'Judge only the response quality.',
  evidence: ['response'],
  output: { scores: [{ name: 'quality', type: 'number' }] },
};

const setup = () => {
  const http = httpServiceMock.createStartContract();
  http.get.mockResolvedValue({ evaluators: [] });
  http.post.mockResolvedValue({ evaluator: { name: 'quality' } });
  http.put.mockResolvedValue({ evaluator: { name: 'quality' } });
  http.delete.mockResolvedValue({ deleted: 1 });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <KibanaContextProvider services={{ http }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );

  return { http, queryClient, wrapper };
};

const listCalls = (http: ReturnType<typeof httpServiceMock.createStartContract>): number =>
  (http.get.mock.calls as ReadonlyArray<readonly unknown[]>).filter(
    ([path]) => path === '/internal/evals/evaluators'
  ).length;

describe('evaluator API hooks', () => {
  it('refreshes every evaluator consumer after create, update, and delete', async () => {
    const { http, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        list: useEvaluators(),
        create: useCreateEvaluator(),
        update: useUpdateEvaluator(),
        remove: useDeleteEvaluator(),
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(listCalls(http)).toBe(1);

    await result.current.create.mutateAsync({
      name: 'quality',
      description: 'Rates quality',
      judge: JUDGE,
    });
    await waitFor(() => expect(listCalls(http)).toBe(2));

    await result.current.update.mutateAsync({
      name: 'quality',
      updates: { description: 'Updated', judge: JUDGE },
    });
    await waitFor(() => expect(listCalls(http)).toBe(3));

    await result.current.remove.mutateAsync('quality');
    await waitFor(() => expect(listCalls(http)).toBe(4));
  });

  it('uses the shared evaluator query key', async () => {
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useEvaluators(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(queryKeys.evaluators.list())).toEqual({ evaluators: [] });
  });

  it('gives up on a server error so the page can show its retry callout', async () => {
    const { http } = setup();
    // Retrying forever would leave the catalog loading through an outage, with its own
    // Retry affordance never reachable.
    http.get.mockRejectedValue(
      Object.assign(new Error('Service Unavailable'), { response: { status: 503 } })
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <KibanaContextProvider services={{ http }}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    );

    const { result } = renderHook(() => useEvaluators(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    // The initial attempt plus MAX_RETRIES.
    expect(listCalls(http)).toBe(4);
  });

  it('reads a past version when one is asked for', async () => {
    const { http, wrapper } = setup();
    http.get.mockResolvedValue({ evaluator: { name: 'quality', versions: ['1.1.0', '1.0.0'] } });

    const { result } = renderHook(() => useEvaluator('quality', '1.0.0'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(http.get).toHaveBeenCalledWith(
      '/internal/evals/evaluators/quality',
      expect.objectContaining({ query: { version: '1.0.0' } })
    );
  });

  it('omits the version so the current definition is served', async () => {
    const { http, wrapper } = setup();
    http.get.mockResolvedValue({ evaluator: { name: 'quality', versions: ['1.1.0'] } });

    const { result } = renderHook(() => useEvaluator('quality'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(http.get).toHaveBeenCalledWith(
      '/internal/evals/evaluators/quality',
      expect.not.objectContaining({ query: expect.anything() })
    );
  });
});
