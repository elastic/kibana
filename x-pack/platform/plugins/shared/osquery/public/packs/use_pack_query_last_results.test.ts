/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { of } from 'rxjs';
import { useKibana } from '../common/lib/kibana';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';
import { usePackQueryLastResults } from './use_pack_query_last_results';

jest.mock('../common/lib/kibana');
jest.mock('../common/hooks/use_logs_data_view');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useLogsDataViewMock = useLogsDataView as jest.MockedFunction<typeof useLogsDataView>;

const MOCK_LOGS_DATA_VIEW = { id: 'logs-*', title: 'logs-osquery_manager.result-*' };

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => null, warn: () => null, error: () => null },
  });

describe('usePackQueryLastResults', () => {
  let mockSearchSource: {
    create: jest.Mock;
    setField: jest.Mock;
    fetch$: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useLogsDataViewMock.mockReturnValue({
      data: MOCK_LOGS_DATA_VIEW,
      isLoading: false,
    } as unknown as ReturnType<typeof useLogsDataView>);

    mockSearchSource = {
      create: jest.fn(),
      setField: jest.fn(),
      fetch$: jest.fn(),
    };

    mockSearchSource.create.mockResolvedValue(mockSearchSource);

    useKibanaMock.mockReturnValue({
      services: {
        data: {
          search: {
            searchSource: mockSearchSource,
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  describe('scheduleId path', () => {
    it('returns lastResultTime, uniqueAgentsCount, docCount, and executionCount from aggregation bucket', async () => {
      const queryClient = createQueryClient();

      mockSearchSource.fetch$.mockReturnValue(
        of({
          rawResponse: {
            aggregations: {
              per_execution: {
                buckets: [
                  {
                    key: 42,
                    doc_count: 150,
                    max_ingested: {
                      value: 1700000000000,
                      value_as_string: '2023-11-14T22:13:20.000Z',
                    },
                    unique_agents: { value: 5 },
                  },
                ],
              },
            },
          },
        })
      );

      const { result } = renderHook(
        () => usePackQueryLastResults({ scheduleId: 'sched-uuid-1234', interval: 3600 }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        lastResultTime: ['2023-11-14T22:13:20.000Z'],
        uniqueAgentsCount: 5,
        docCount: 150,
        executionCount: 42,
      });

      // Locks down the single-round-trip property: one `per_execution` terms agg
      // over `osquery_meta.schedule_execution_count` with sub-aggs for max
      // `event.ingested` and `agent.id` cardinality, ordered by max_ingested desc.
      expect(mockSearchSource.setField).toHaveBeenCalledWith('aggs', {
        per_execution: {
          terms: {
            field: 'osquery_meta.schedule_execution_count',
            size: 1,
            shard_size: 100,
            order: { max_ingested: 'desc' },
          },
          aggs: {
            max_ingested: { max: { field: 'event.ingested' } },
            unique_agents: { cardinality: { field: 'agent.id' } },
          },
        },
      });
    });

    it('returns null when buckets are empty and no actionId fallback exists', async () => {
      const queryClient = createQueryClient();

      mockSearchSource.fetch$.mockReturnValue(
        of({
          rawResponse: {
            aggregations: {
              per_execution: {
                buckets: [],
              },
            },
          },
        })
      );

      const { result } = renderHook(
        () => usePackQueryLastResults({ scheduleId: 'sched-uuid-no-results', interval: 3600 }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
    });
  });

  describe('schedule → action fallback', () => {
    it('falls back to the actionId branch when the schedule branch finds no docs', async () => {
      const queryClient = createQueryClient();

      // Three responses, in order:
      //   1) schedule branch: no buckets → fall through
      //   2) action branch: latest hit by event.ingested
      //   3) action branch: range-bound aggs for unique_agents / total docs
      mockSearchSource.fetch$
        .mockReturnValueOnce(
          of({
            rawResponse: {
              aggregations: {
                per_execution: { buckets: [] },
              },
            },
          })
        )
        .mockReturnValueOnce(
          of({
            rawResponse: {
              hits: {
                hits: [
                  {
                    fields: {
                      'event.ingested': ['2023-11-14T22:13:20.000Z'],
                    },
                  },
                ],
              },
            },
          })
        )
        .mockReturnValueOnce(
          of({
            rawResponse: {
              hits: { total: 5 },
              aggregations: {
                unique_agents: { value: 2 },
              },
            },
          })
        );

      const { result } = renderHook(
        () =>
          usePackQueryLastResults({
            scheduleId: 'sched-uuid-empty',
            actionId: 'legacy-action-id',
            interval: 3600,
          }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Returns legacy-shape data (no `executionCount`) so callers fall back
      // to the action_id link/title.
      expect(result.current.data).toEqual({
        lastResultTime: ['2023-11-14T22:13:20.000Z'],
        uniqueAgentsCount: 2,
        docCount: 5,
      });

      // Sanity: we issued the schedule probe + 2 action-branch requests.
      expect(mockSearchSource.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('actionId path', () => {
    it('returns lastResultTime, uniqueAgentsCount, and docCount from hits and aggs', async () => {
      const queryClient = createQueryClient();

      mockSearchSource.fetch$
        .mockReturnValueOnce(
          of({
            rawResponse: {
              hits: {
                hits: [
                  {
                    fields: {
                      'event.ingested': ['2023-11-14T22:13:20.000Z'],
                    },
                  },
                ],
              },
            },
          })
        )
        .mockReturnValueOnce(
          of({
            rawResponse: {
              hits: { total: 42 },
              aggregations: {
                unique_agents: { value: 3 },
              },
            },
          })
        );

      const { result } = renderHook(
        () => usePackQueryLastResults({ actionId: 'action-uuid-1234', interval: 3600 }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        lastResultTime: ['2023-11-14T22:13:20.000Z'],
        uniqueAgentsCount: 3,
        docCount: 42,
      });

      // First call: latest hit by event.ingested. Second call: range-bound aggs
      // for unique_agents and total docs. Both must filter on action_id.
      expect(mockSearchSource.create).toHaveBeenCalledTimes(2);
      expect(mockSearchSource.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: [{ match_phrase: { action_id: 'action-uuid-1234' } }],
            }),
          }),
        })
      );
      expect(mockSearchSource.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ match_phrase: { action_id: 'action-uuid-1234' } }]),
            }),
          }),
        })
      );
      expect(mockSearchSource.setField).toHaveBeenCalledWith('aggs', {
        unique_agents: { cardinality: { field: 'agent.id' } },
      });
    });

    it('returns null when no hits are found', async () => {
      const queryClient = createQueryClient();

      mockSearchSource.fetch$.mockReturnValue(
        of({
          rawResponse: {
            hits: { hits: [] },
          },
        })
      );

      const { result } = renderHook(
        () => usePackQueryLastResults({ actionId: 'action-uuid-no-results', interval: 3600 }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
    });
  });

  describe('enabled condition', () => {
    it('does not fetch when neither actionId nor scheduleId is set', () => {
      const queryClient = createQueryClient();

      const { result } = renderHook(() => usePackQueryLastResults({ interval: 3600 }), {
        wrapper: createWrapper(queryClient),
      });

      // When enabled is false, fetchStatus stays idle — no network request is made
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSearchSource.create).not.toHaveBeenCalled();
    });
  });

  describe('id precedence', () => {
    it('prefers scheduleId over actionId when both are provided', async () => {
      const queryClient = createQueryClient();

      mockSearchSource.fetch$.mockReturnValue(
        of({
          rawResponse: {
            aggregations: {
              per_execution: {
                buckets: [
                  {
                    key: 1,
                    doc_count: 7,
                    max_ingested: {
                      value: 1700000000000,
                      value_as_string: '2023-11-14T22:13:20.000Z',
                    },
                    unique_agents: { value: 2 },
                  },
                ],
              },
            },
          },
        })
      );

      const { result } = renderHook(
        () =>
          usePackQueryLastResults({
            actionId: 'action-uuid-ignored',
            scheduleId: 'sched-wins',
            interval: 3600,
          }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Schedule branch issues exactly one request; legacy actionId branch would issue two.
      expect(mockSearchSource.create).toHaveBeenCalledTimes(1);
      expect(mockSearchSource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: [
                { term: { schedule_id: 'sched-wins' } },
                { range: { 'event.ingested': { gte: 'now-30d' } } },
              ],
            }),
          }),
        })
      );
      expect(result.current.data).toEqual({
        lastResultTime: ['2023-11-14T22:13:20.000Z'],
        uniqueAgentsCount: 2,
        docCount: 7,
        executionCount: 1,
      });
    });
  });
});
