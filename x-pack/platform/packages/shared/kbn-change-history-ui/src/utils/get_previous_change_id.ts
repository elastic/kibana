/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItem } from '../types/change_history_list_item';

/**
 * Returns the id of the chronologically previous change for diff preview.
 *
 * Requires `listItems` in descending timestamp order (newest first). Workflow
 * history adapters return pages in that order; callers must preserve it when
 * paginating/appending list rows.
 */
export const getPreviousChangeId = (
  listItems: ChangeHistoryListItem[],
  selectedChangeId: string | undefined
): string | undefined => {
  if (!selectedChangeId) {
    return undefined;
  }

  const selectedIndex = listItems.findIndex((item) => item.id === selectedChangeId);
  if (selectedIndex < 0 || selectedIndex >= listItems.length - 1) {
    return undefined;
  }

  return listItems[selectedIndex + 1]?.id;
};
