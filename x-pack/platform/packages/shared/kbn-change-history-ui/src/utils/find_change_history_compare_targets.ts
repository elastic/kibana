/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItem } from '../types/change_history_list_item';

/** Resolves baseline (older) and target (newer) for two versions in a newest-first list. */
export const resolveChronologicalComparePair = (
  items: ChangeHistoryListItem[],
  changeIdA: string,
  changeIdB: string
): { baselineChangeId: string; targetChangeId: string } | undefined => {
  if (changeIdA === changeIdB) {
    return undefined;
  }

  const indexA = items.findIndex((item) => item.id === changeIdA);
  const indexB = items.findIndex((item) => item.id === changeIdB);

  if (indexA < 0 || indexB < 0) {
    return undefined;
  }

  if (indexA < indexB) {
    return { baselineChangeId: changeIdB, targetChangeId: changeIdA };
  }

  return { baselineChangeId: changeIdA, targetChangeId: changeIdB };
};

/** Resolves the chronologically previous row for a selection in a newest-first list. */
export const findPreviousChangeId = (
  items: ChangeHistoryListItem[],
  selectedChangeId: string
): string | undefined => {
  const selectedIndex = items.findIndex((item) => item.id === selectedChangeId);
  if (selectedIndex < 0 || selectedIndex >= items.length - 1) {
    return undefined;
  }

  return items[selectedIndex + 1]?.id;
};
