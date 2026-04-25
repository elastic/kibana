/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  TARGET_TYPE_DATA_VIEW,
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
} from '../../common/target_types';
import { useDataViewsList } from '../../common/services/target_lookup/hooks/use_data_views_list';
import { useResolveIndex } from '../../common/services/target_lookup/hooks/use_resolve_index';
import { useTargetIdOptions } from './use_target_id_options';

jest.mock('../../common/services/target_lookup/hooks/use_data_views_list', () => ({
  useDataViewsList: jest.fn(),
}));
jest.mock('../../common/services/target_lookup/hooks/use_resolve_index', () => ({
  useResolveIndex: jest.fn(),
}));

const targetLookupClient = {
  getDataViews: jest.fn(),
  getDataViewById: jest.fn(),
  resolveIndex: jest.fn(),
  getFieldsForWildcard: jest.fn(),
};

describe('useTargetIdOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDataViewsList).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useDataViewsList>);
    jest.mocked(useResolveIndex).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useResolveIndex>);
  });

  it('maps data view options from query results', () => {
    jest.mocked(useDataViewsList).mockReturnValue({
      data: { data_view: [{ id: 'dv-1', title: 'logs-*', name: 'Logs' }] },
      isFetching: false,
    } as unknown as ReturnType<typeof useDataViewsList>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetIdSearchValue: 'lo',
        debouncedTargetSearchValue: 'lo',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(result.current.targetIdOptions).toEqual([{ label: 'Logs', value: 'dv-1' }]);
    expect(result.current.isTargetIdLoading).toBe(false);
  });

  it('uses data view title when name is missing', () => {
    jest.mocked(useDataViewsList).mockReturnValue({
      data: { data_view: [{ id: 'dv-1', title: 'logs-*' }] },
      isFetching: false,
    } as unknown as ReturnType<typeof useDataViewsList>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetIdSearchValue: '',
        debouncedTargetSearchValue: '',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(result.current.targetIdOptions).toEqual([{ label: 'logs-*', value: 'dv-1' }]);
  });

  it('uses data views loading state and disables resolve suggestions for data view targets', () => {
    jest.mocked(useDataViewsList).mockReturnValue({
      data: undefined,
      isFetching: true,
    } as unknown as ReturnType<typeof useDataViewsList>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetIdSearchValue: 'logs',
        debouncedTargetSearchValue: 'logs',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(result.current.isTargetIdLoading).toBe(true);
    expect(jest.mocked(useResolveIndex)).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '',
        enabled: false,
      })
    );
  });

  it('maps resolve-index options and keeps custom fallback', () => {
    jest.mocked(useResolveIndex).mockReturnValue({
      data: {
        data_streams: [{ name: 'logs-stream' }],
        aliases: [{ name: 'logs-alias' }],
        indices: [{ name: 'logs-index' }],
      },
      isFetching: true,
    } as unknown as ReturnType<typeof useResolveIndex>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: 'logs',
        debouncedTargetSearchValue: 'logs',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(result.current.targetIdOptions).toEqual(
      expect.arrayContaining([
        { label: 'logs', value: 'logs' },
        { label: 'logs-index', value: 'logs-index' },
      ])
    );
    expect(result.current.isTargetIdLoading).toBe(true);
  });

  it('returns empty options when resolve-index has no data', () => {
    jest.mocked(useResolveIndex).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useResolveIndex>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: 'logs',
        debouncedTargetSearchValue: 'logs',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(result.current.targetIdOptions).toEqual([]);
  });

  it('limits index options to 100 items', () => {
    jest.mocked(useResolveIndex).mockReturnValue({
      data: {
        data_streams: [],
        aliases: [],
        indices: Array.from({ length: 150 }, (_, idx) => ({
          name: `logs-${String(idx).padStart(3, '0')}`,
        })),
      },
      isFetching: false,
    } as unknown as ReturnType<typeof useResolveIndex>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: '',
        debouncedTargetSearchValue: '',
        targetLookupClient,
        shouldLoadTargetOptions: true,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(result.current.targetIdOptions).toHaveLength(100);
  });

  it('uses wildcard-suffixed lookup query for index targets', () => {
    renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX,
        targetIdSearchValue: 'kibana',
        debouncedTargetSearchValue: 'kibana',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(jest.mocked(useResolveIndex)).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'kibana*',
        targetType: TARGET_TYPE_INDEX,
      })
    );
  });

  it('keeps literal lookup query for index_pattern targets', () => {
    renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: 'kibana',
        debouncedTargetSearchValue: 'kibana',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(jest.mocked(useResolveIndex)).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'kibana',
        targetType: TARGET_TYPE_INDEX_PATTERN,
      })
    );
  });

  it('does not pre-load options when query is empty', () => {
    renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: '',
        debouncedTargetSearchValue: '',
        targetLookupClient,
        shouldLoadTargetOptions: false,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(jest.mocked(useResolveIndex)).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '',
        enabled: false,
      })
    );
  });

  it('pre-loads options when explicitly enabled', () => {
    renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: '',
        debouncedTargetSearchValue: '',
        targetLookupClient,
        shouldLoadTargetOptions: true,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(jest.mocked(useResolveIndex)).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '*',
        enabled: true,
      })
    );
  });

  it('passes open expand wildcards when hidden/system indices are disabled', () => {
    renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: '',
        debouncedTargetSearchValue: '',
        targetLookupClient,
        shouldLoadTargetOptions: true,
        includeHiddenAndSystemIndices: false,
      })
    );

    expect(jest.mocked(useResolveIndex)).toHaveBeenCalledWith(
      expect.objectContaining({
        expandWildcards: 'open',
      })
    );
  });

  it('passes all expand wildcards when hidden/system indices are enabled', () => {
    renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: '',
        debouncedTargetSearchValue: '',
        targetLookupClient,
        shouldLoadTargetOptions: true,
        includeHiddenAndSystemIndices: true,
      })
    );

    expect(jest.mocked(useResolveIndex)).toHaveBeenCalledWith(
      expect.objectContaining({
        expandWildcards: 'all',
      })
    );
  });

  it('filters out unavailable index options and custom fallback', () => {
    jest.mocked(useResolveIndex).mockReturnValue({
      data: {
        data_streams: [],
        aliases: [],
        indices: [{ name: 'logs-index' }, { name: 'metrics-index' }],
      },
      isFetching: false,
    } as unknown as ReturnType<typeof useResolveIndex>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetIdSearchValue: 'logs-index',
        debouncedTargetSearchValue: 'logs-index',
        targetLookupClient,
        shouldLoadTargetOptions: true,
        includeHiddenAndSystemIndices: false,
        unavailableTargetIds: ['logs-index'],
      })
    );

    expect(result.current.targetIdOptions).toEqual([
      { label: 'metrics-index', value: 'metrics-index' },
    ]);
  });

  it('filters out unavailable data view options', () => {
    jest.mocked(useDataViewsList).mockReturnValue({
      data: {
        data_view: [
          { id: 'dv-1', title: 'logs-*', name: 'Logs' },
          { id: 'dv-2', title: 'metrics-*', name: 'Metrics' },
        ],
      },
      isFetching: false,
    } as unknown as ReturnType<typeof useDataViewsList>);

    const { result } = renderHook(() =>
      useTargetIdOptions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetIdSearchValue: '',
        debouncedTargetSearchValue: '',
        targetLookupClient,
        shouldLoadTargetOptions: true,
        includeHiddenAndSystemIndices: false,
        unavailableTargetIds: ['dv-1'],
      })
    );

    expect(result.current.targetIdOptions).toEqual([{ label: 'Metrics', value: 'dv-2' }]);
  });
});
