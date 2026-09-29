/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { act, renderHook, waitFor } from '@testing-library/react';
import { useQueryClient } from '@kbn/react-query';
import { createTargetLookupClient } from '../../common/services/target_lookup/client';
import { useDataViewsList } from '../../common/services/target_lookup/hooks/use_data_views_list';
import { useResolveIndex } from '../../common/services/target_lookup/hooks/use_resolve_index';
import { TARGET_LOOKUP_DEBOUNCE_MS } from '../constants';
import {
  TARGET_TYPE_DATA_VIEW,
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
} from '../../common/target_types';
import { useTargetIdField } from './use_target_id_field';

vi.mock('@kbn/react-query', () => {
      const mocked = {
      useQueryClient: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/services/target_lookup/client', () => {
      const mocked = {
      createTargetLookupClient: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/services/target_lookup/hooks/use_data_views_list', () => {
      const mocked = {
      useDataViewsList: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../common/services/target_lookup/hooks/use_resolve_index', () => {
      const mocked = {
      useResolveIndex: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const targetLookupClient = {
  getDataViews: vi.fn(),
  getDataViewById: vi.fn(),
  resolveIndex: vi.fn(),
  getFieldsForWildcard: vi.fn(),
};

const fetchQuery = vi.fn();

describe('useTargetIdField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    vi.mocked(useQueryClient).mockReturnValue({
      fetchQuery,
    } as unknown as ReturnType<typeof useQueryClient>);

    vi.mocked(createTargetLookupClient).mockReturnValue(targetLookupClient);
    vi.mocked(useDataViewsList).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useDataViewsList>);
    vi.mocked(useResolveIndex).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useResolveIndex>);
  });

  it('debounces resolve-index queries while keeping suggestions enabled', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange: vi.fn(),
        onTargetIdChange: vi.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSearchChange('ab');
    });

    expect(vi.mocked(useResolveIndex).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        query: '',
        enabled: false,
      })
    );

    act(() => {
      vi.advanceTimersByTime(TARGET_LOOKUP_DEBOUNCE_MS);
    });

    expect(vi.mocked(useResolveIndex).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        query: 'ab',
        enabled: true,
      })
    );
  });

  it('uses wildcard-suffixed resolve query for index targets', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange: vi.fn(),
        onTargetIdChange: vi.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSearchChange('kibana');
    });

    act(() => {
      vi.advanceTimersByTime(TARGET_LOOKUP_DEBOUNCE_MS);
    });

    expect(vi.mocked(useResolveIndex).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        query: 'kibana*',
        targetType: TARGET_TYPE_INDEX,
        enabled: true,
      })
    );
  });

  it('validates concrete index target on selection and returns async error when unresolved', async () => {
    fetchQuery.mockResolvedValue({ indices: [{ name: 'other-index' }] });
    const onFieldRulesChange = vi.fn();
    const onTargetIdChange = vi.fn();

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange,
        onTargetIdChange,
      })
    );

    act(() => {
      result.current.onTargetIdSelectChange([{ label: 'logs-*', value: 'logs-*' }]);
    });

    await waitFor(() => {
      expect(result.current.targetIdAsyncError).toContain(
        'Target id must resolve to a concrete index'
      );
    });
    expect(onTargetIdChange).toHaveBeenCalledWith('logs-*');
    expect(onFieldRulesChange).not.toHaveBeenCalled();
  });

  it('hydrates field rules once per target key on selection', async () => {
    fetchQuery.mockImplementation(async ({ queryKey }) => {
      if (queryKey[1] === 'dataViewById') {
        return { data_view: { title: 'logs-*' } };
      }
      if (queryKey[1] === 'fieldsForWildcard') {
        return {
          fields: [{ name: 'host.name' }, { name: '_id', metadata_field: true }],
        };
      }
      return { indices: [] };
    });

    const onFieldRulesChange = vi.fn();
    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange,
        onTargetIdChange: vi.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSelectChange([{ label: 'Logs (dv-1)', value: 'dv-1' }]);
    });

    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledTimes(1);
    });
    expect(onFieldRulesChange).toHaveBeenCalledWith([
      { field: 'host.name', allowed: true, anonymized: false, entityClass: undefined },
    ]);

    act(() => {
      result.current.onTargetIdSelectChange([{ label: 'Logs (dv-1)', value: 'dv-1' }]);
    });

    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledTimes(1);
    });
  });

  it('rehydrates field rules when selecting a different target', async () => {
    fetchQuery.mockImplementation(async ({ queryKey }) => {
      if (queryKey[1] === 'dataViewById') {
        if (queryKey[2] === 'dv-1') {
          return { data_view: { title: 'logs-*' } };
        }
        return { data_view: { title: 'metrics-*' } };
      }
      if (queryKey[1] === 'fieldsForWildcard') {
        if (queryKey[2] === 'logs-*') {
          return { fields: [{ name: 'host.name' }] };
        }
        return { fields: [] };
      }
      return { indices: [] };
    });

    const onFieldRulesChange = vi.fn();
    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange,
        onTargetIdChange: vi.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSelectChange([{ label: 'Logs (dv-1)', value: 'dv-1' }]);
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledWith([
        { field: 'host.name', allowed: true, anonymized: false, entityClass: undefined },
      ]);
    });

    act(() => {
      result.current.onTargetIdSelectChange([{ label: 'Metrics (dv-2)', value: 'dv-2' }]);
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenLastCalledWith([]);
    });
  });

  it('maps data view results to combo box options', () => {
    vi.mocked(useDataViewsList).mockReturnValue({
      data: {
        data_view: [{ id: 'dv-1', title: 'logs-*', name: 'Logs' }],
      },
      isFetching: false,
    } as unknown as ReturnType<typeof useDataViewsList>);

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: 'dv-1',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange: vi.fn(),
        onTargetIdChange: vi.fn(),
      })
    );

    expect(result.current.targetIdOptions).toEqual([{ label: 'Logs', value: 'dv-1' }]);
  });

  it('shows plain selected target id when current value is not in options', () => {
    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: 'logs-*',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange: vi.fn(),
        onTargetIdChange: vi.fn(),
      })
    );

    expect(result.current.selectedTargetIdOptions).toEqual([{ label: 'logs-*', value: 'logs-*' }]);
  });

  it('maps resolve-index results to target options and keeps custom value', () => {
    vi.useFakeTimers();
    vi.mocked(useResolveIndex).mockReturnValue({
      data: {
        data_streams: [{ name: 'logs-stream' }],
        aliases: [{ name: 'logs-alias' }],
        indices: [{ name: 'logs-index' }],
      },
      isFetching: false,
    } as unknown as ReturnType<typeof useResolveIndex>);

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange: vi.fn(),
        onTargetIdChange: vi.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSearchChange('logs');
      vi.advanceTimersByTime(TARGET_LOOKUP_DEBOUNCE_MS);
    });

    expect(result.current.targetIdOptions).toEqual(
      expect.arrayContaining([
        { label: 'logs', value: 'logs' },
        { label: 'logs-index', value: 'logs-index' },
      ])
    );
  });

  it('blocks selecting a target that already has a profile', () => {
    const onTargetIdChange = vi.fn();
    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: vi.fn(),
        onFieldRulesChange: vi.fn(),
        onTargetIdChange,
        unavailableTargetIds: ['logs-index'],
      })
    );

    act(() => {
      result.current.onTargetIdCreateOption?.('logs-index');
    });

    expect(onTargetIdChange).not.toHaveBeenCalled();
    expect(result.current.targetIdAsyncError).toContain('already has an anonymization profile');
  });
});
