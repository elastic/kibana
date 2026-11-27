/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutMenuPagination } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';

/**
 * Builds the details flyout's previous/next pagination from the table's displayed rows, or
 * returns `undefined` when the current row is not in the list or there is nothing to page to.
 */
export const getFlyoutPagination = (
  displayedRows: DataTableRecord[],
  currentId: string,
  onSelect: (doc: DataTableRecord) => void
): EuiFlyoutMenuPagination | undefined => {
  const total = displayedRows.length;
  if (total <= 1) {
    return undefined;
  }

  const currentIndex = displayedRows.findIndex(({ id }) => id === currentId);
  if (currentIndex === -1) {
    return undefined;
  }

  return {
    currentIndex,
    total,
    onPrevious: () => onSelect(displayedRows[currentIndex - 1]),
    onNext: () => onSelect(displayedRows[currentIndex + 1]),
  };
};
