/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryCompareSpec } from '../types/change_history_compare';
import type { ChangeHistoryDetail } from '../types/change_history_detail';
import type { ChangeHistoryCompareRowOverride } from '../types/change_history_compare_override';
import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import { resolveChangeHistoryCompareEndpoints } from '../utils/resolve_change_history_compare_endpoints';
import { useChangeHistoryDetail } from './use_change_history_detail';

export interface UseChangeHistoryCompareArgs {
  adapter: ChangeHistoryAdapter;
  objectId: string;
  listItems: ChangeHistoryListItem[];
  selectedChange?: ChangeHistoryDetail;
  selectedChangeId?: string;
  compareOverride?: ChangeHistoryCompareRowOverride;
  /** When false, compare resolution and detail loads are skipped. Defaults to true. */
  enabled?: boolean;
}

export interface UseChangeHistoryCompareResult {
  compareSpec?: ChangeHistoryCompareSpec;
  isLoadingCompareContext: boolean;
}

export const useChangeHistoryCompare = ({
  adapter,
  objectId,
  listItems,
  selectedChange,
  selectedChangeId,
  compareOverride,
  enabled = true,
}: UseChangeHistoryCompareArgs): UseChangeHistoryCompareResult => {
  const endpoints = useMemo(
    () =>
      enabled && selectedChangeId
        ? resolveChangeHistoryCompareEndpoints(listItems, selectedChangeId, compareOverride)
        : undefined,
    [compareOverride, enabled, listItems, selectedChangeId]
  );

  const baselineChangeId = endpoints?.baselineChangeId;
  const targetChangeId = endpoints?.targetChangeId;

  const shouldLoadBaseline =
    enabled &&
    Boolean(baselineChangeId) &&
    Boolean(selectedChangeId) &&
    baselineChangeId !== selectedChangeId;
  const shouldLoadTarget =
    enabled &&
    Boolean(targetChangeId) &&
    Boolean(selectedChangeId) &&
    targetChangeId !== selectedChangeId;

  const { change: loadedBaselineChange, isLoading: isLoadingBaseline } = useChangeHistoryDetail({
    adapter,
    objectId,
    changeId: baselineChangeId,
    enabled: shouldLoadBaseline,
  });

  const { change: loadedTargetChange, isLoading: isLoadingTarget } = useChangeHistoryDetail({
    adapter,
    objectId,
    changeId: targetChangeId,
    enabled: shouldLoadTarget,
  });

  const baselineChange =
    baselineChangeId === selectedChangeId ? selectedChange : loadedBaselineChange;
  const targetChange = targetChangeId === selectedChangeId ? selectedChange : loadedTargetChange;

  const compareSpec = useMemo((): ChangeHistoryCompareSpec | undefined => {
    if (!endpoints || !baselineChange || !targetChange) {
      return undefined;
    }

    return {
      comparisonType: endpoints.comparisonType,
      baseline: baselineChange,
      target: targetChange,
    };
  }, [baselineChange, endpoints, targetChange]);

  return {
    compareSpec,
    isLoadingCompareContext:
      (shouldLoadBaseline && isLoadingBaseline) || (shouldLoadTarget && isLoadingTarget),
  };
};
