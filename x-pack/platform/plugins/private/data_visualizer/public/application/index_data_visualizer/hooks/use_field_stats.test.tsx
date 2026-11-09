/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { Observable } from 'rxjs';
import { RequestCancellationManager } from '@kbn/presentation-publishing';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';

import { SUPPORTED_FIELD_TYPES } from '../../../../common/constants';
import type {
  OverallStatsSearchStrategyParams,
  SamplingOption,
} from '../../../../common/types/field_stats';
import type { FieldRequestConfig } from '../../../../common/types/field_request_config';
import type { DataVisualizerIndexBasedAppState } from '../types/index_data_visualizer_state';
import { useFieldStatsSearchStrategy } from './use_field_stats';

const search = jest.fn();

const services = {
  data: {
    search: {
      search: (...args: unknown[]) => search(...args),
    },
  },
  notifications: { toasts: {} },
};

jest.mock('../../kibana_context', () => ({
  useDataVisualizerKibana: () => ({ services }),
}));

// jsdom 20's AbortSignal does not implement AbortSignal.any, which current browsers do.
if (typeof AbortSignal.any !== 'function') {
  AbortSignal.any = (signals: AbortSignal[]): AbortSignal => {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    return controller.signal;
  };
}

const samplingOption: SamplingOption = { mode: 'no_sampling', seed: '1' };

const searchStrategyParams = {
  earliest: 0,
  latest: 10,
  aggInterval: { asMilliseconds: () => 1000 },
  searchQuery: { match_all: {} },
  index: 'test-index',
  browserSessionSeed: 1,
  samplingOption,
  aggregatableFields: [],
  nonAggregatableFields: [],
} as OverallStatsSearchStrategyParams;

const keywordField: FieldRequestConfig = {
  fieldName: 'message',
  type: SUPPORTED_FIELD_TYPES.KEYWORD,
  cardinality: 5,
  existsInDocs: true,
};

const fieldStatsParams = {
  metricConfigs: [],
  nonMetricConfigs: [keywordField],
};

const listState: DataVisualizerIndexBasedAppState = {
  pageSize: 10,
  pageIndex: 0,
  sortField: 'fieldName',
  sortDirection: 'asc',
};

describe('useFieldStatsSearchStrategy', () => {
  beforeEach(() => {
    search.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks the fetch cancelled when a batch search is aborted before it returns an id', () => {
    search.mockImplementation((_request: unknown, options?: { abortSignal?: AbortSignal }) => {
      return new Observable((subscriber) => {
        const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
        const abortSignal = options?.abortSignal;
        if (abortSignal?.aborted) {
          subscriber.error(abortError);
          return;
        }
        const onAbort = () => subscriber.error(abortError);
        abortSignal?.addEventListener('abort', onAbort, { once: true });
        return () => abortSignal?.removeEventListener('abort', onAbort);
      });
    });

    const requestCancellationManager = new RequestCancellationManager();
    const { result } = renderHook(() =>
      useFieldStatsSearchStrategy(
        searchStrategyParams,
        fieldStatsParams,
        listState,
        null,
        requestCancellationManager
      )
    );

    expect(search).toHaveBeenCalledTimes(1);

    act(() => {
      requestCancellationManager.cancel(AbortReason.CANCELED);
    });

    expect(result.current.progress.cancelled).toBe(true);
    expect(result.current.progress.isRunning).toBe(false);
    expect(result.current.progress.loaded).toBe(0);
    // The aborted batch is not retried one field at a time.
    expect(search).toHaveBeenCalledTimes(1);
    expect(result.current.fieldStats).toBeUndefined();
  });

  it('retries a failed batch when the failure is not a cancellation', () => {
    const subscribers: Array<{ error: (error: Error) => void }> = [];
    search.mockImplementation(() => {
      return new Observable((subscriber) => {
        subscribers.push(subscriber);
      });
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFieldStatsSearchStrategy(searchStrategyParams, fieldStatsParams, listState, null)
    );

    expect(search).toHaveBeenCalledTimes(1);

    act(() => {
      subscribers[0].error(new Error('search failed'));
    });

    expect(result.current.progress.cancelled).toBe(false);
    expect(result.current.progress.error).toBeUndefined();
    // A real batch failure is retried one field at a time.
    expect(search).toHaveBeenCalledTimes(2);
  });
});
