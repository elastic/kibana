/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountHook } from 'test_utils/enzyme_helpers';

import { ApolloClientContext } from '../../../utils/apollo_context';
import { useLogSummary } from './log_summary';

describe('useLogSummary hook', () => {
  it('provides an empty list of buckets by default', () => {
    const mockApolloClient = {
      query: jest.fn(),
    };

    const { getLastHookValue } = mountHook(
      () => useLogSummary('SOURCE_ID', null, 1000, null),
      createMockApolloProvider(mockApolloClient)
    );

    expect(getLastHookValue().buckets).toEqual([]);
  });

  /**
   * This is skipped until `act` can deal with async operations, see comment
   * below.
   *
   * The test cases below this are a temporary alternative until the
   * shortcomings of the `act` function have been overcome.
   */
  it.skip('queries for new summary buckets when the source id changes', async () => {
    const firstMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 1 }]);
    const secondMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 2 }]);
    const mockApolloClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(firstMockResponse)
        .mockResolvedValueOnce(secondMockResponse),
    };

    const { act, getLastHookValue } = mountHook(
      ({ sourceId }) => useLogSummary(sourceId, 100000, 1000, null),
      createMockApolloProvider(mockApolloClient),
      { sourceId: 'INITIAL_SOURCE_ID' }
    );

    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          sourceId: 'INITIAL_SOURCE_ID',
        }),
      })
    );
    expect(getLastHookValue().buckets).toEqual(
      firstMockResponse.data.source.logSummaryBetween.buckets
    );

    // DOESN'T WORK YET until https://github.com/facebook/react/pull/14853 has been merged
    await act(async (_, setArgs) => {
      setArgs({ sourceId: 'CHANGED_SOURCE_ID' });

      // wait for the promise queue to be processed
      await mockApolloClient.query();
    });

    expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          sourceId: 'CHANGED_SOURCE_ID',
        }),
      })
    );
    expect(getLastHookValue().buckets).toEqual(
      secondMockResponse.data.source.logSummaryBetween.buckets
    );
  });

  /**
   * The following test cases use a bad workaround to avoid the problems
   * exhibited by the skipped test case above. Instead of a real Promise we
   * fake a synchronously resolving promise-like return value to avoid any
   * async behavior.
   *
   * They should be rewritten to the cleaner async/await style shown in the
   * test case above once `act` is capable of dealing with it.
   */

  it('queries for new summary buckets when the source id changes - workaround', () => {
    const firstMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 1 }]);
    const secondMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 2 }]);
    const mockApolloClient = {
      query: jest
        .fn()
        .mockReturnValueOnce(createSyncMockPromise(firstMockResponse))
        .mockReturnValueOnce(createSyncMockPromise(secondMockResponse)),
    };

    const { act, getLastHookValue } = mountHook(
      ({ sourceId }) => useLogSummary(sourceId, 100000, 1000, null),
      createMockApolloProvider(mockApolloClient),
      { sourceId: 'INITIAL_SOURCE_ID' }
    );

    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          sourceId: 'INITIAL_SOURCE_ID',
        }),
      })
    );
    expect(getLastHookValue().buckets).toEqual(
      firstMockResponse.data.source.logSummaryBetween.buckets
    );

    act((_, setArgs) => {
      setArgs({ sourceId: 'CHANGED_SOURCE_ID' });
    });

    expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          sourceId: 'CHANGED_SOURCE_ID',
        }),
      })
    );
    expect(getLastHookValue().buckets).toEqual(
      secondMockResponse.data.source.logSummaryBetween.buckets
    );
  });

  it('queries for new summary buckets when the filter query changes', () => {
    const firstMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 1 }]);
    const secondMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 2 }]);
    const mockApolloClient = {
      query: jest
        .fn()
        .mockReturnValueOnce(createSyncMockPromise(firstMockResponse))
        .mockReturnValueOnce(createSyncMockPromise(secondMockResponse)),
    };

    const { act, getLastHookValue } = mountHook(
      ({ filterQuery }) => useLogSummary('SOURCE_ID', 100000, 1000, filterQuery),
      createMockApolloProvider(mockApolloClient),
      { filterQuery: 'INITIAL_FILTER_QUERY' }
    );

    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          filterQuery: 'INITIAL_FILTER_QUERY',
        }),
      })
    );
    expect(getLastHookValue().buckets).toEqual(
      firstMockResponse.data.source.logSummaryBetween.buckets
    );

    act((_, setArgs) => {
      setArgs({ filterQuery: 'CHANGED_FILTER_QUERY' });
    });

    expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          filterQuery: 'CHANGED_FILTER_QUERY',
        }),
      })
    );
    expect(getLastHookValue().buckets).toEqual(
      secondMockResponse.data.source.logSummaryBetween.buckets
    );
  });

  it('queries for new summary buckets when the midpoint time changes', () => {
    const mockApolloClient = {
      query: jest
        .fn()
        .mockReturnValueOnce(createSyncMockPromise(createMockResponse([])))
        .mockReturnValueOnce(createSyncMockPromise(createMockResponse([]))),
    };

    const { act } = mountHook(
      ({ midpointTime }) => useLogSummary('SOURCE_ID', midpointTime, 1000, null),
      createMockApolloProvider(mockApolloClient),
      { midpointTime: 100000 }
    );

    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          start: 98500,
          end: 101500,
        }),
      })
    );

    act((_, setArgs) => {
      setArgs({ midpointTime: 200000 });
    });

    expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          start: 198500,
          end: 201500,
        }),
      })
    );
  });

  it('queries for new summary buckets when the interval size changes', () => {
    const mockApolloClient = {
      query: jest
        .fn()
        .mockReturnValueOnce(createSyncMockPromise(createMockResponse([])))
        .mockReturnValueOnce(createSyncMockPromise(createMockResponse([]))),
    };

    const { act } = mountHook(
      ({ intervalSize }) => useLogSummary('SOURCE_ID', 100000, intervalSize, null),
      createMockApolloProvider(mockApolloClient),
      { intervalSize: 1000 }
    );

    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          bucketSize: 10,
          start: 98500,
          end: 101500,
        }),
      })
    );

    act((_, setArgs) => {
      setArgs({ intervalSize: 2000 });
    });

    expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
    expect(mockApolloClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          bucketSize: 20,
          start: 97000,
          end: 103000,
        }),
      })
    );
  });
});

const createMockApolloProvider = (mockClient: any): React.FunctionComponent => ({ children }) => (
  <ApolloClientContext.Provider value={mockClient}>{children}</ApolloClientContext.Provider>
);

const createMockResponse = (
  buckets: Array<{ start: number; end: number; entriesCount: number }>
) => ({ data: { source: { logSummaryBetween: { buckets } } } });

const createSyncMockPromise = <Value extends any>(value: Value) => ({
  then: (callback: (value: Value) => any) => callback(value),
});
