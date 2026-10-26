/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { TARGET_TYPE_DATA_VIEW, TARGET_TYPE_INDEX } from '../../common/target_types';
import { useDataViewsList } from '../../common/services/target_lookup/hooks/use_data_views_list';
import { useResolveIndex } from '../../common/services/target_lookup/hooks/use_resolve_index';
import type {
  ExpandWildcardsMode,
  TargetLookupClient,
} from '../../common/services/target_lookup/client';
import type { TargetType } from '../types';
import { TARGET_ID_OPTIONS_LIMIT } from '../constants';

interface UseTargetIdOptionsParams {
  targetType: TargetType;
  targetIdSearchValue: string;
  debouncedTargetSearchValue: string;
  targetLookupClient: TargetLookupClient;
  shouldLoadTargetOptions: boolean;
  includeHiddenAndSystemIndices: boolean;
  unavailableTargetIds?: string[];
}

export const useTargetIdOptions = ({
  targetType,
  targetIdSearchValue,
  debouncedTargetSearchValue,
  targetLookupClient,
  shouldLoadTargetOptions,
  includeHiddenAndSystemIndices,
  unavailableTargetIds = [],
}: UseTargetIdOptionsParams) => {
  const isDataViewTarget = targetType === TARGET_TYPE_DATA_VIEW;
  const expandWildcards: ExpandWildcardsMode = includeHiddenAndSystemIndices ? 'all' : 'open';
  const trimmedDebouncedSearchValue = debouncedTargetSearchValue.trim();
  const resolveIndexLookupQuery = (() => {
    if (isDataViewTarget) {
      return '';
    }
    if (!trimmedDebouncedSearchValue && shouldLoadTargetOptions) {
      return '*';
    }
    if (targetType === TARGET_TYPE_INDEX && !trimmedDebouncedSearchValue.includes('*')) {
      return `${trimmedDebouncedSearchValue}*`;
    }
    return trimmedDebouncedSearchValue;
  })();

  // TODO: Consider adding backend-capped prefetch for empty queries so we can show popular targets
  // without fetching unbounded resolve_index results.
  const shouldResolveIndexSuggestions =
    !isDataViewTarget && (shouldLoadTargetOptions || trimmedDebouncedSearchValue.length > 0);

  const dataViewsListQuery = useDataViewsList({
    client: targetLookupClient,
    enabled: isDataViewTarget,
  });

  const resolveIndexQuery = useResolveIndex({
    client: targetLookupClient,
    query: resolveIndexLookupQuery,
    targetType,
    expandWildcards,
    enabled: shouldResolveIndexSuggestions,
  });

  const unavailableTargetIdSet = useMemo(
    () => new Set(unavailableTargetIds),
    [unavailableTargetIds]
  );

  const targetIdOptions = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    if (isDataViewTarget) {
      return (dataViewsListQuery.data?.data_view ?? [])
        .map((dataView) => {
          const displayName = dataView.name ?? dataView.title;
          return {
            label: displayName,
            value: dataView.id,
          };
        })
        .filter((option) => !unavailableTargetIdSet.has(option.value ?? option.label ?? ''));
    }

    if (!resolveIndexQuery.data) {
      return [];
    }

    const queryValue = targetIdSearchValue.trim();
    const normalizedQueryValue = queryValue.toLowerCase();
    const options: Array<EuiComboBoxOptionOption<string>> = (resolveIndexQuery.data.indices ?? [])
      .map((index) => ({
        label: index.name,
        value: index.name,
      }))
      .filter((option) => !unavailableTargetIdSet.has(option.value ?? option.label ?? ''));

    const rankOption = ({ value }: EuiComboBoxOptionOption<string>): number => {
      if (!normalizedQueryValue) {
        return 0;
      }

      const normalizedValue = (value ?? '').toLowerCase();
      if (normalizedValue === normalizedQueryValue) {
        return 0;
      }
      if (normalizedValue.startsWith(normalizedQueryValue)) {
        return 1;
      }
      if (normalizedValue.includes(normalizedQueryValue)) {
        return 2;
      }
      return 3;
    };

    const sortedOptions = options
      .sort((left, right) => {
        const rankDelta = rankOption(left) - rankOption(right);
        if (rankDelta !== 0) {
          return rankDelta;
        }
        return (left.value ?? '').localeCompare(right.value ?? '');
      })
      .slice(0, TARGET_ID_OPTIONS_LIMIT);

    if (
      queryValue &&
      !unavailableTargetIdSet.has(queryValue) &&
      sortedOptions.every((option) => option.value !== queryValue)
    ) {
      sortedOptions.unshift({ label: queryValue, value: queryValue });
      return sortedOptions.slice(0, TARGET_ID_OPTIONS_LIMIT);
    }

    return sortedOptions;
  }, [
    dataViewsListQuery.data,
    isDataViewTarget,
    resolveIndexQuery.data,
    targetIdSearchValue,
    unavailableTargetIdSet,
  ]);

  const isTargetIdLoading = isDataViewTarget
    ? dataViewsListQuery.isFetching
    : resolveIndexQuery.isFetching;

  return { targetIdOptions, isTargetIdLoading };
};
