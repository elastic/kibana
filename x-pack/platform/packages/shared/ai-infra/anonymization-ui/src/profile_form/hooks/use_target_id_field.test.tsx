/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('@kbn/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('../../common/services/target_lookup/client', () => ({
  createTargetLookupClient: jest.fn(),
}));

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

const fetchQuery = jest.fn();

describe('useTargetIdField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    jest.mocked(useQueryClient).mockReturnValue({
      fetchQuery,
    } as unknown as ReturnType<typeof useQueryClient>);

    jest.mocked(createTargetLookupClient).mockReturnValue(targetLookupClient);
    jest.mocked(useDataViewsList).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useDataViewsList>);
    jest.mocked(useResolveIndex).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useResolveIndex>);
  });

  it('debounces resolve-index queries while keeping suggestions enabled', () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: jest.fn(),
        onFieldRulesChange: jest.fn(),
        onTargetIdChange: jest.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSearchChange('ab');
    });

    expect(jest.mocked(useResolveIndex).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        query: '',
        enabled: false,
      })
    );

    act(() => {
      jest.advanceTimersByTime(TARGET_LOOKUP_DEBOUNCE_MS);
    });

    expect(jest.mocked(useResolveIndex).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        query: 'ab',
        enabled: true,
      })
    );
  });

  it('uses wildcard-suffixed resolve query for index targets', () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: jest.fn(),
        onFieldRulesChange: jest.fn(),
        onTargetIdChange: jest.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSearchChange('kibana');
    });

    act(() => {
      jest.advanceTimersByTime(TARGET_LOOKUP_DEBOUNCE_MS);
    });

    expect(jest.mocked(useResolveIndex).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        query: 'kibana*',
        targetType: TARGET_TYPE_INDEX,
        enabled: true,
      })
    );
  });

  it('validates concrete index target on selection and returns async error when unresolved', async () => {
    fetchQuery.mockResolvedValue({ indices: [{ name: 'other-index' }] });
    const onFieldRulesChange = jest.fn();
    const onTargetIdChange = jest.fn();

    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: jest.fn(),
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

    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: jest.fn(),
        onFieldRulesChange,
        onTargetIdChange: jest.fn(),
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

    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: jest.fn(),
        onFieldRulesChange,
        onTargetIdChange: jest.fn(),
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
    jest.mocked(useDataViewsList).mockReturnValue({
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
        fetch: jest.fn(),
        onFieldRulesChange: jest.fn(),
        onTargetIdChange: jest.fn(),
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
        fetch: jest.fn(),
        onFieldRulesChange: jest.fn(),
        onTargetIdChange: jest.fn(),
      })
    );

    expect(result.current.selectedTargetIdOptions).toEqual([{ label: 'logs-*', value: 'logs-*' }]);
  });

  it('maps resolve-index results to target options and keeps custom value', () => {
    jest.useFakeTimers();
    jest.mocked(useResolveIndex).mockReturnValue({
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
        fetch: jest.fn(),
        onFieldRulesChange: jest.fn(),
        onTargetIdChange: jest.fn(),
      })
    );

    act(() => {
      result.current.onTargetIdSearchChange('logs');
      jest.advanceTimersByTime(TARGET_LOOKUP_DEBOUNCE_MS);
    });

    expect(result.current.targetIdOptions).toEqual(
      expect.arrayContaining([
        { label: 'logs', value: 'logs' },
        { label: 'logs-index', value: 'logs-index' },
      ])
    );
  });

  it('blocks selecting a target that already has a profile', () => {
    const onTargetIdChange = jest.fn();
    const { result } = renderHook(() =>
      useTargetIdField({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        fetch: jest.fn(),
        onFieldRulesChange: jest.fn(),
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
