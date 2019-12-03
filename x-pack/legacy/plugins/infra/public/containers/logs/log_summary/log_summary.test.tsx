/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountHook } from 'test_utils/enzyme_helpers';

import { useLogSummary } from './log_summary';

import { fetchLogSummary } from './api/log_summary';

// Typescript doesn't know that `fetchLogSummary` is a jest mock.
// We use a second variable with a type cast to help the compiler further down the line.
jest.mock('./api/log_summary', () => ({ fetchLogSummary: jest.fn() }));
const fetchLogSummaryMock = fetchLogSummary as jest.Mock;

describe('useLogSummary hook', () => {
  beforeEach(() => {
    fetchLogSummaryMock.mockClear();
  });

  it('provides an empty list of buckets by default', () => {
    const { getLastHookValue } = mountHook(() => useLogSummary('SOURCE_ID', null, 1000, null));
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

    fetchLogSummaryMock
      .mockResolvedValueOnce(firstMockResponse)
      .mockResolvedValueOnce(secondMockResponse);

    const { act, getLastHookValue } = mountHook(
      ({ sourceId }) => useLogSummary(sourceId, 100000, 1000, null),
      Identity,
      { sourceId: 'INITIAL_SOURCE_ID' }
    );
    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    // expect(mockApolloClient.query).toHaveBeenLastCalledWith(
    //   expect.objectContaining({
    //     variables: expect.objectContaining({
    //       sourceId: 'INITIAL_SOURCE_ID',
    //     }),
    //   })
    // );
    expect(getLastHookValue().buckets).toEqual(firstMockResponse.buckets);

    // DOESN'T WORK YET until https://github.com/facebook/react/pull/14853 has been merged
    await act(async (_, setArgs) => {
      setArgs({ sourceId: 'CHANGED_SOURCE_ID' });

      // wait for the promise queue to be processed
      await fetchLogSummaryMock();
    });

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          sourceId: 'CHANGED_SOURCE_ID',
        }),
      })
    );
    expect(getLastHookValue().buckets).toEqual(secondMockResponse.buckets);
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

    fetchLogSummaryMock
      .mockReturnValueOnce(createSyncMockPromise(firstMockResponse))
      .mockReturnValueOnce(createSyncMockPromise(secondMockResponse));

    const { act, getLastHookValue } = mountHook(
      ({ sourceId }) => useLogSummary(sourceId, 100000, 1000, null),
      Identity,
      { sourceId: 'INITIAL_SOURCE_ID' }
    );

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(getLastHookValue().buckets).toEqual(firstMockResponse.buckets);

    act((_, setArgs) => {
      setArgs({ sourceId: 'CHANGED_SOURCE_ID' });
    });

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourceId: 'CHANGED_SOURCE_ID',
      })
    );
    expect(getLastHookValue().buckets).toEqual(secondMockResponse.buckets);
  });

  it('queries for new summary buckets when the filter query changes', () => {
    const firstMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 1 }]);
    const secondMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 2 }]);

    fetchLogSummaryMock
      .mockReturnValueOnce(createSyncMockPromise(firstMockResponse))
      .mockReturnValueOnce(createSyncMockPromise(secondMockResponse));

    const { act, getLastHookValue } = mountHook(
      ({ filterQuery }) => useLogSummary('SOURCE_ID', 100000, 1000, filterQuery),
      Identity,
      { filterQuery: 'INITIAL_FILTER_QUERY' }
    );

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'INITIAL_FILTER_QUERY',
      })
    );
    expect(getLastHookValue().buckets).toEqual(firstMockResponse.buckets);

    act((_, setArgs) => {
      setArgs({ filterQuery: 'CHANGED_FILTER_QUERY' });
    });

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'CHANGED_FILTER_QUERY',
      })
    );
    expect(getLastHookValue().buckets).toEqual(secondMockResponse.buckets);
  });

  it('queries for new summary buckets when the midpoint time changes', () => {
    fetchLogSummaryMock
      .mockReturnValueOnce(createSyncMockPromise(createMockResponse([])))
      .mockReturnValueOnce(createSyncMockPromise(createMockResponse([])));

    const { act } = mountHook(
      ({ midpointTime }) => useLogSummary('SOURCE_ID', midpointTime, 1000, null),
      Identity,
      { midpointTime: 100000 }
    );

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: 98500,
        endDate: 101500,
      })
    );

    act((_, setArgs) => {
      setArgs({ midpointTime: 200000 });
    });

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: 198500,
        endDate: 201500,
      })
    );
  });

  it('queries for new summary buckets when the interval size changes', () => {
    fetchLogSummaryMock
      .mockReturnValueOnce(createSyncMockPromise(createMockResponse([])))
      .mockReturnValueOnce(createSyncMockPromise(createMockResponse([])));

    const { act } = mountHook(
      ({ intervalSize }) => useLogSummary('SOURCE_ID', 100000, intervalSize, null),
      Identity,
      { intervalSize: 1000 }
    );

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bucketSize: 10,
        startDate: 98500,
        endDate: 101500,
      })
    );

    act((_, setArgs) => {
      setArgs({ intervalSize: 2000 });
    });

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bucketSize: 20,
        startDate: 97000,
        endDate: 103000,
      })
    );
  });
});

const Identity: React.FunctionComponent = ({ children }) => <>{children}</>;

const createMockResponse = (
  buckets: Array<{ start: number; end: number; entriesCount: number }>
) => ({ buckets });

const createSyncMockPromise = <Value extends any>(value: Value) => ({
  then: (callback: (value: Value) => any) => callback(value),
});
