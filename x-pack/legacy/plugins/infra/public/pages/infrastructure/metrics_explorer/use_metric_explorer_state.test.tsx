/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetch } from '../../../utils/fetch';
import { renderHook } from '@testing-library/react-hooks';
import { useMetricsExplorerState } from './use_metric_explorer_state';
import { MetricsExplorerOptionsContainer } from '../../../containers/metrics_explorer/use_metrics_explorer_options';
import React from 'react';
import {
  source,
  derivedIndexPattern,
  resp,
  createSeries,
} from '../../../utils/fixtures/metrics_explorer';

const renderUseMetricsExplorerStateHook = () =>
  renderHook(props => useMetricsExplorerState(props.source, props.derivedIndexPattern), {
    initialProps: { source, derivedIndexPattern },
    wrapper: ({ children }) => (
      <MetricsExplorerOptionsContainer.Provider>
        {children}
      </MetricsExplorerOptionsContainer.Provider>
    ),
  });

jest.mock('../../../utils/fetch');
const mockedFetch = fetch as jest.Mocked<typeof fetch>;

interface LocalStore {
  [key: string]: string;
}

interface LocalStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const STORE: LocalStore = {};
const localStorageMock: LocalStorage = {
  getItem: (key: string) => {
    return STORE[key] || null;
  },
  setItem: (key: string, value: any) => {
    STORE[key] = value.toString();
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useMetricsExplorerState', () => {
  beforeEach(() => {
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    delete STORE.MetricsExplorerOptions;
    delete STORE.MetricsExplorerTimeRange;
  });

  it('should just work', async () => {
    const { result, waitForNextUpdate } = renderUseMetricsExplorerStateHook();
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
    const { series } = result.current.data!;
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
  });

  describe('handleRefresh', () => {
    it('should trigger an addition request when handleRefresh is called', async () => {
      const { result, waitForNextUpdate } = renderUseMetricsExplorerStateHook();
      await waitForNextUpdate();
      expect(mockedFetch.post.mock.calls.length).toBe(2);
      const { handleRefresh } = result.current;
      handleRefresh();
      await waitForNextUpdate();
      expect(mockedFetch.post.mock.calls.length).toBe(3);
    });
  });

  describe('handleMetricsChange', () => {
    it('should change the metric', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleMetricsChange } = result.current;
      handleMetricsChange([{ aggregation: 'max', field: 'system.load.1' }]);
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'max', field: 'system.load.1' },
      ]);
    });
  });

  describe('handleGroupByChange', () => {
    it('should change the metric', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleGroupByChange } = result.current;
      handleGroupByChange('host.name');
      expect(result.current.options.groupBy).toBeDefined();
      expect(result.current.options.groupBy).toBe('host.name');
    });
  });

  describe('handleTimeChange', () => {
    it('should change the time range', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleTimeChange } = result.current;
      handleTimeChange('now-10m', 'now');
      expect(result.current.currentTimerange).toEqual({
        from: 'now-10m',
        to: 'now',
        interval: '>=10s',
      });
    });
  });

  describe('handleFilterQuerySubmit', () => {
    it('should set the filter query', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleFilterQuerySubmit } = result.current;
      handleFilterQuerySubmit('host.name: "example-host-01"');
      expect(result.current.options.filterQuery).toBe('host.name: "example-host-01"');
    });
  });

  describe('handleAggregationChange', () => {
    it('should set the metrics to only count when selecting count', async () => {
      const { result, waitForNextUpdate } = renderUseMetricsExplorerStateHook();
      const { handleMetricsChange } = result.current;
      handleMetricsChange([{ aggregation: 'avg', field: 'system.load.1' }]);
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'avg', field: 'system.load.1' },
      ]);
      await waitForNextUpdate();
      const { handleAggregationChange } = result.current;
      handleAggregationChange('count');
      await waitForNextUpdate();
      expect(result.current.options.aggregation).toBe('count');
      expect(result.current.options.metrics).toEqual([{ aggregation: 'count' }]);
    });

    it('should change aggregation for metrics', async () => {
      const { result, waitForNextUpdate } = renderUseMetricsExplorerStateHook();
      const { handleMetricsChange } = result.current;
      handleMetricsChange([{ aggregation: 'avg', field: 'system.load.1' }]);
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'avg', field: 'system.load.1' },
      ]);
      await waitForNextUpdate();
      const { handleAggregationChange } = result.current;
      handleAggregationChange('max');
      await waitForNextUpdate();
      expect(result.current.options.aggregation).toBe('max');
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'max', field: 'system.load.1' },
      ]);
    });
  });

  describe('handleLoadMore', () => {
    it('should load more based on the afterKey', async () => {
      const { result, waitForNextUpdate, rerender } = renderUseMetricsExplorerStateHook();
      expect(result.current.data).toBe(null);
      expect(result.current.loading).toBe(true);
      await waitForNextUpdate();
      expect(result.current.data).toEqual(resp);
      expect(result.current.loading).toBe(false);
      const { series, pageInfo } = result.current.data!;
      expect(series).toBeDefined();
      expect(series.length).toBe(3);
      mockedFetch.post.mockResolvedValue({
        data: {
          pageInfo: { total: 10, afterKey: 'host-06' },
          series: [createSeries('host-04'), createSeries('host-05'), createSeries('host-06')],
        },
      } as any);
      const { handleLoadMore } = result.current;
      handleLoadMore(pageInfo.afterKey!);
      await rerender();
      expect(result.current.loading).toBe(true);
      await waitForNextUpdate();
      expect(result.current.loading).toBe(false);
      const { series: nextSeries } = result.current.data!;
      expect(nextSeries).toBeDefined();
      expect(nextSeries.length).toBe(6);
    });
  });
});
