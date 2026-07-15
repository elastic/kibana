/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryCompareEndpoints } from '../types/change_history_compare';
import type { ChangeHistoryCompareRowOverride } from '../types/change_history_compare_override';
import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import {
  findPreviousChangeId,
  resolveChronologicalComparePair,
} from './find_change_history_compare_targets';

export const resolveChangeHistoryCompareEndpoints = (
  listItems: ChangeHistoryListItem[],
  selectedChangeId: string,
  compareOverride?: ChangeHistoryCompareRowOverride
): ChangeHistoryCompareEndpoints | undefined => {
  if (compareOverride?.type === 'vs_row') {
    const pair = resolveChronologicalComparePair(
      listItems,
      selectedChangeId,
      compareOverride.rowChangeId
    );

    if (!pair) {
      return undefined;
    }

    return {
      comparisonType: 'vs_row',
      baselineChangeId: pair.baselineChangeId,
      targetChangeId: pair.targetChangeId,
    };
  }

  const previousChangeId = findPreviousChangeId(listItems, selectedChangeId);
  if (!previousChangeId) {
    return undefined;
  }

  return {
    comparisonType: 'vs_previous',
    baselineChangeId: previousChangeId,
    targetChangeId: selectedChangeId,
  };
};
