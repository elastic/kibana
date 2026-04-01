/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import type { GroupedInferenceEndpointsData, GroupByViewOptions } from '../types';

import { GroupByReducer, GroupBySort } from '../utils/group_by';

export const isGroupOpen = (groupToggleState: Record<string, boolean>, groupId: string): boolean =>
  groupToggleState[groupId] !== false;

export interface UseGroupsAccordionToggleStateResult {
  groupToggleState: Record<string, boolean>;
  expandAll: () => void;
  collapseAll: () => void;
  toggleGroup: (groupId: string, open: boolean) => void;
}

export const useGroupsAccordionToggleState = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  groupBy: GroupByViewOptions
): UseGroupsAccordionToggleStateResult => {
  const [groupByView, setGroupByView] = useState<GroupByViewOptions>(groupBy);
  const [groupToggleState, setGroupToggleState] = useState<Record<string, boolean>>({});

  const allGroupIds = useMemo(() => {
    const groupedMap = inferenceEndpoints.reduce<Record<string, GroupedInferenceEndpointsData>>(
      GroupByReducer(groupBy),
      {}
    );
    const list = Object.values(groupedMap);
    list.sort(GroupBySort(groupBy));
    return list.map((g) => g.groupId);
  }, [inferenceEndpoints, groupBy]);

  useEffect(() => {
    if (groupBy !== groupByView) {
      // When GroupBy selection changes, reset all groups to open
      setGroupByView(groupBy);
      setGroupToggleState(
        allGroupIds.reduce<Record<string, boolean>>((acc, id) => ({ ...acc, [id]: true }), {})
      );
      return;
    }

    setGroupToggleState((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of allGroupIds) {
        if (next[id] === undefined) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [allGroupIds, groupBy, groupByView]);

  const expandAll = useCallback(() => {
    setGroupToggleState(
      allGroupIds.reduce<Record<string, boolean>>((acc, id) => ({ ...acc, [id]: true }), {})
    );
  }, [allGroupIds]);

  const collapseAll = useCallback(() => {
    setGroupToggleState(
      allGroupIds.reduce<Record<string, boolean>>((acc, id) => ({ ...acc, [id]: false }), {})
    );
  }, [allGroupIds]);

  const toggleGroup = useCallback((groupId: string, open: boolean) => {
    setGroupToggleState((prev) => ({ ...prev, [groupId]: open }));
  }, []);

  return { groupToggleState, expandAll, collapseAll, toggleGroup };
};
