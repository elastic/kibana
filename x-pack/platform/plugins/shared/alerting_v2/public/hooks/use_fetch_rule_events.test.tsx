/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { buildCollapsedStatusPhasesQuery } from '@kbn/alerting-v2-common-queries';
import { runEsqlAsyncSearch } from '@kbn/alerting-v2-episodes-ui/utils/run_esql_async_search';
import { useFetchRuleEvents } from './use_fetch_rule_events';

jest.mock('@kbn/alerting-v2-episodes-ui/utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const WINDOW_START_MS = Date.parse('2024-01-01T00:00:00.000Z');
const WINDOW_END_MS = Date.parse('2024-01-02T00:00:00.000Z');

const topNResponse: ESQLSearchResponse = {
  columns: [
    { name: 'group_hash', type: 'keyword' },
    { name: 'last_event_ts', type: 'date' },
  ],
  values: [['hash-1', '2024-01-01T12:00:00.000Z']],
};

const selectionResponse: ESQLSearchResponse = {
  columns: [
    { name: 'episode.id', type: 'keyword' },
    { name: 'group_hash', type: 'keyword' },
    { name: 'last_ts', type: 'date' },
  ],
  values: [['ep-1', 'hash-1', '2024-01-01T12:00:00.000Z']],
};

const emptyResponse: ESQLSearchResponse = { columns: [], values: [] };

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFetchRuleEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runEsqlAsyncSearchMock.mockImplementation(async ({ params: { query } }) => {
      if (query.includes('last_event_ts')) return topNResponse;
      if (query.includes('BY episode.id, group_hash')) return selectionResponse;
      return emptyResponse;
    });
  });

  it('bounds the phases query to the space and display window for the selected alerts', async () => {
    const { result } = renderHook(
      () =>
        useFetchRuleEvents({
          ruleId: 'rule-1',
          windowStartMs: WINDOW_START_MS,
          windowEndMs: WINDOW_END_MS,
          spaceId: 'space-1',
          data: dataPluginMock.createStartContract(),
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: buildCollapsedStatusPhasesQuery({
            spaceId: 'space-1',
            ruleId: 'rule-1',
            alertIds: ['ep-1'],
            window: { startMs: WINDOW_START_MS, endMs: WINDOW_END_MS },
          }).print('basic'),
        }),
      })
    );
  });

  it('waits for the active space before fetching the phases', async () => {
    const data = dataPluginMock.createStartContract();
    const initialProps: { spaceId: string | undefined } = { spaceId: undefined };
    const isPhasesCall = ([{ params }]: Parameters<typeof runEsqlAsyncSearch>) =>
      params.query.includes('seg_start');
    const { result, rerender } = renderHook(
      ({ spaceId }: { spaceId: string | undefined }) =>
        useFetchRuleEvents({
          ruleId: 'rule-1',
          windowStartMs: WINDOW_START_MS,
          windowEndMs: WINDOW_END_MS,
          spaceId,
          data,
        }),
      { wrapper: createWrapper(), initialProps }
    );

    await waitFor(() =>
      expect(
        runEsqlAsyncSearchMock.mock.calls.some(([{ params }]) =>
          params.query.includes('BY episode.id, group_hash')
        )
      ).toBe(true)
    );
    expect(runEsqlAsyncSearchMock.mock.calls.some(isPhasesCall)).toBe(false);
    expect(result.current.isLoading).toBe(true);

    rerender({ spaceId: 'space-1' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const phasesCalls = runEsqlAsyncSearchMock.mock.calls.filter(isPhasesCall);
    expect(phasesCalls).toHaveLength(1);
    expect(phasesCalls[0][0].params.query).toBe(
      buildCollapsedStatusPhasesQuery({
        spaceId: 'space-1',
        ruleId: 'rule-1',
        alertIds: ['ep-1'],
        window: { startMs: WINDOW_START_MS, endMs: WINDOW_END_MS },
      }).print('basic')
    );
  });

  it('does not query when there is no rule', () => {
    renderHook(
      () =>
        useFetchRuleEvents({
          ruleId: undefined,
          windowStartMs: WINDOW_START_MS,
          windowEndMs: WINDOW_END_MS,
          spaceId: 'space-1',
          data: dataPluginMock.createStartContract(),
        }),
      { wrapper: createWrapper() }
    );

    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });
});
