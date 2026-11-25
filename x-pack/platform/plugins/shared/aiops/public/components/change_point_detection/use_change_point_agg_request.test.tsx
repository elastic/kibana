/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useCancellableSearch } from '../../hooks/use_cancellable_search';
import { useDataSource } from '../../hooks/use_data_source';
import { useReload } from '../../hooks/use_reload';
import type { ChangePointDetectionRequestParams } from './change_point_detection_context';
import { useChangePointResults } from './use_change_point_agg_request';

jest.mock('../../hooks/use_aiops_app_context');
jest.mock('../../hooks/use_cancellable_search');
jest.mock('../../hooks/use_data_source');
jest.mock('../../hooks/use_reload');

const runRequest = jest.fn();
const cancelRequest = jest.fn();
const addError = jest.fn();

describe('useChangePointResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(useAiopsAppContext).mockReturnValue({
      notifications: { toasts: { addError } },
    } as unknown as ReturnType<typeof useAiopsAppContext>);
    jest.mocked(useCancellableSearch).mockReturnValue({
      runRequest,
      cancelRequest,
      isLoading: false,
    });
    jest.mocked(useDataSource).mockReturnValue({
      dataView: {
        getIndexPattern: () => 'logs-*',
        timeFieldName: '@timestamp',
      },
    } as unknown as ReturnType<typeof useDataSource>);
    jest.mocked(useReload).mockReturnValue({ refreshTimestamp: 1 } as ReturnType<typeof useReload>);
  });

  it('stops loading and shows a toast when the search fails', async () => {
    const searchError = new Error('search failed');
    runRequest.mockRejectedValueOnce(searchError);

    const requestParams: ChangePointDetectionRequestParams = {
      fieldConfigs: [],
      interval: '1h',
      query: { query: '', language: 'kuery' },
      filters: [],
    };
    const query = {};
    const { result } = renderHook(() =>
      useChangePointResults({ fn: 'avg', metricField: 'bytes' }, requestParams, query, 10000)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(addError).toHaveBeenCalledWith(searchError, expect.any(Object));
  });
});
