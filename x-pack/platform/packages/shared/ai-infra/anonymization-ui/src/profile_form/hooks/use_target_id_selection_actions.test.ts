/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID } from '@kbn/anonymization-common';
import { TARGET_TYPE_DATA_VIEW, TARGET_TYPE_INDEX } from '../../common/target_types';
import type { TargetType } from '../types';
import { useTargetIdSelectionActions } from './use_target_id_selection_actions';

const targetLookupClient = {
  getDataViews: jest.fn(),
  getDataViewById: jest.fn(),
  resolveIndex: jest.fn(),
  getFieldsForWildcard: jest.fn(),
};

const fetchQuery = jest.fn();

describe('useTargetIdSelectionActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets async error when index validation fails', async () => {
    fetchQuery.mockResolvedValueOnce({ indices: [{ name: 'other' }] });

    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-*',
        includeHiddenAndSystemIndices: false,
        onFieldRulesChange: jest.fn(),
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    await act(async () => {
      await result.current.applyTargetIdSelection('logs-*');
    });

    await waitFor(() => {
      expect(result.current.targetIdAsyncError).toContain(
        'Target id must resolve to a concrete index'
      );
    });
  });

  it('skips concrete-index validation for global profile target id', async () => {
    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_INDEX,
        targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
        includeHiddenAndSystemIndices: false,
        onFieldRulesChange: jest.fn(),
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    await act(async () => {
      const isValid = await result.current.applyTargetIdSelection(
        GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
        {
          hydrate: false,
        }
      );
      expect(isValid).toBe(true);
    });

    expect(fetchQuery).not.toHaveBeenCalled();
  });

  it('hydrates field rules once per target key', async () => {
    fetchQuery.mockImplementation(async ({ queryKey }) => {
      if (queryKey[1] === 'dataViewById') {
        return { data_view: { title: 'logs-*' } };
      }
      if (queryKey[1] === 'fieldsForWildcard') {
        return { fields: [{ name: 'host.name' }] };
      }
      return { indices: [] };
    });
    const onFieldRulesChange = jest.fn();

    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: 'dv-1',
        includeHiddenAndSystemIndices: false,
        onFieldRulesChange,
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    await act(async () => {
      await result.current.applyTargetIdSelection('dv-1');
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.applyTargetIdSelection('dv-1');
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledTimes(1);
    });
  });

  it('hydrates data-view fields from data views list when by-id lookup fails', async () => {
    fetchQuery.mockImplementation(async ({ queryKey }) => {
      if (queryKey[1] === 'dataViewsList') {
        return {
          data_view: [{ id: 'dv-1', title: 'logs-*' }],
        };
      }
      if (queryKey[1] === 'dataViewById') {
        throw new Error('by-id lookup failed');
      }
      if (queryKey[1] === 'fieldsForWildcard') {
        return { fields: [{ name: 'host.name' }] };
      }
      return { indices: [] };
    });
    const onFieldRulesChange = jest.fn();

    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: 'dv-1',
        includeHiddenAndSystemIndices: false,
        onFieldRulesChange,
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    await act(async () => {
      const isValid = await result.current.applyTargetIdSelection('dv-1');
      expect(isValid).toBe(true);
    });

    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledWith([
        { field: 'host.name', allowed: true, anonymized: false, entityClass: undefined },
      ]);
    });
  });

  it('rehydrates field rules when switching targets', async () => {
    fetchQuery.mockImplementation(async ({ queryKey }) => {
      if (queryKey[1] === 'dataViewById') {
        const dataViewId = queryKey[2];
        return { data_view: { title: `${dataViewId}-*` } };
      }
      if (queryKey[1] === 'fieldsForWildcard') {
        return { fields: [{ name: `${queryKey[2]}.field` }] };
      }
      return { indices: [] };
    });
    const onFieldRulesChange = jest.fn();

    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        onFieldRulesChange,
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    await act(async () => {
      await result.current.applyTargetIdSelection('dv-1');
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.applyTargetIdSelection('dv-2');
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledTimes(2);
    });
  });

  it('applies only the latest commit when commits resolve out of order', async () => {
    let resolveFirst: ((value: { fields: Array<{ name: string }> }) => void) | undefined;
    let resolveSecond: ((value: { fields: Array<{ name: string }> }) => void) | undefined;

    fetchQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[1] === 'fieldsForWildcard') {
        if (queryKey[2] === 'dv-1-*') {
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        if (queryKey[2] === 'dv-2-*') {
          return new Promise((resolve) => {
            resolveSecond = resolve;
          });
        }
      }

      if (queryKey[1] === 'dataViewById') {
        return Promise.resolve({ data_view: { title: `${queryKey[2]}-*` } });
      }

      return Promise.resolve({ indices: [] });
    });

    const onFieldRulesChange = jest.fn();

    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: '',
        includeHiddenAndSystemIndices: false,
        onFieldRulesChange,
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    let firstCommitPromise: Promise<boolean> | undefined;
    let secondCommitPromise: Promise<boolean> | undefined;
    await act(async () => {
      firstCommitPromise = result.current.applyTargetIdSelection('dv-1');
      secondCommitPromise = result.current.applyTargetIdSelection('dv-2');
    });

    await waitFor(() => {
      expect(resolveSecond).toBeDefined();
    });

    await act(async () => {
      resolveSecond?.({ fields: [{ name: 'second.field' }] });
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledWith([
        { field: 'second.field', allowed: true, anonymized: false, entityClass: undefined },
      ]);
    });

    await act(async () => {
      resolveFirst?.({ fields: [{ name: 'first.field' }] });
    });
    await act(async () => {
      await Promise.all([firstCommitPromise, secondCommitPromise]);
    });
    await waitFor(() => {
      expect(onFieldRulesChange).toHaveBeenCalledTimes(1);
    });
  });

  it('ignores stale commit results after target context changes', async () => {
    let resolvePendingFields: ((value: { fields: Array<{ name: string }> }) => void) | undefined;

    fetchQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[1] === 'fieldsForWildcard') {
        return new Promise((resolve) => {
          resolvePendingFields = resolve;
        });
      }

      if (queryKey[1] === 'dataViewById') {
        return Promise.resolve({ data_view: { title: `${queryKey[2]}-*` } });
      }

      return Promise.resolve({ indices: [] });
    });

    const onFieldRulesChange = jest.fn();
    const initialProps: { targetType: TargetType; targetId: string } = {
      targetType: TARGET_TYPE_DATA_VIEW,
      targetId: 'dv-1',
    };

    const { result, rerender } = renderHook(
      ({ targetType, targetId }: { targetType: TargetType; targetId: string }) =>
        useTargetIdSelectionActions({
          targetType,
          targetId,
          includeHiddenAndSystemIndices: false,
          onFieldRulesChange,
          queryClient: { fetchQuery },
          targetLookupClient,
        }),
      {
        initialProps,
      }
    );

    let commitPromise: Promise<boolean> | undefined;
    await act(async () => {
      commitPromise = result.current.applyTargetIdSelection('dv-1');
    });

    await waitFor(() => {
      expect(resolvePendingFields).toBeDefined();
    });

    rerender({ targetType: TARGET_TYPE_INDEX, targetId: '' });
    expect(result.current.isValidatingTargetId).toBe(false);

    await act(async () => {
      resolvePendingFields?.({ fields: [{ name: 'stale.field' }] });
    });

    await act(async () => {
      await commitPromise;
    });

    expect(onFieldRulesChange).not.toHaveBeenCalled();
    expect(result.current.targetIdAsyncError).toBeUndefined();
  });

  it('keeps current commit valid after targetId prop updates to the selected id', async () => {
    let resolvePendingFields: ((value: { fields: Array<{ name: string }> }) => void) | undefined;

    fetchQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[1] === 'dataViewsList') {
        return Promise.resolve({
          data_view: [{ id: 'dv-1', title: 'dv-1-*' }],
        });
      }
      if (queryKey[1] === 'fieldsForWildcard') {
        return new Promise((resolve) => {
          resolvePendingFields = resolve;
        });
      }
      return Promise.resolve({ indices: [] });
    });

    const onFieldRulesChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ targetId }: { targetId: string }) =>
        useTargetIdSelectionActions({
          targetType: TARGET_TYPE_DATA_VIEW,
          targetId,
          includeHiddenAndSystemIndices: false,
          onFieldRulesChange,
          queryClient: { fetchQuery },
          targetLookupClient,
        }),
      {
        initialProps: {
          targetId: '',
        },
      }
    );

    let commitPromise: Promise<boolean> | undefined;
    await act(async () => {
      commitPromise = result.current.applyTargetIdSelection('dv-1');
    });

    await waitFor(() => {
      expect(resolvePendingFields).toBeDefined();
    });

    rerender({ targetId: 'dv-1' });

    await act(async () => {
      resolvePendingFields?.({ fields: [{ name: 'host.name' }] });
      await commitPromise;
    });

    expect(onFieldRulesChange).toHaveBeenCalledWith([
      { field: 'host.name', allowed: true, anonymized: false, entityClass: undefined },
    ]);
  });

  it('uses open wildcard mode for index validation when hidden/system indices are disabled', async () => {
    fetchQuery.mockImplementation(async ({ queryFn }) => queryFn());
    targetLookupClient.resolveIndex.mockResolvedValueOnce({ indices: [{ name: 'logs-1' }] });

    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
        includeHiddenAndSystemIndices: false,
        onFieldRulesChange: jest.fn(),
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    await act(async () => {
      await result.current.applyTargetIdSelection('logs-1', { hydrate: false });
    });

    expect(targetLookupClient.resolveIndex).toHaveBeenCalledWith('logs-1', {
      expandWildcards: 'open',
    });
  });

  it('uses all wildcard mode for index validation when hidden/system indices are enabled', async () => {
    fetchQuery.mockImplementation(async ({ queryFn }) => queryFn());
    targetLookupClient.resolveIndex.mockResolvedValueOnce({ indices: [{ name: 'logs-1' }] });

    const { result } = renderHook(() =>
      useTargetIdSelectionActions({
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
        includeHiddenAndSystemIndices: true,
        onFieldRulesChange: jest.fn(),
        queryClient: { fetchQuery },
        targetLookupClient,
      })
    );

    await act(async () => {
      await result.current.applyTargetIdSelection('logs-1', { hydrate: false });
    });

    expect(targetLookupClient.resolveIndex).toHaveBeenCalledWith('logs-1', {
      expandWildcards: 'all',
    });
  });
});
