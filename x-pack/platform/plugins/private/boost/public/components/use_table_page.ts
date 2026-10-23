/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { Criteria, Pagination } from '@elastic/eui';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/** The last page index that still has rows, so a search that leaves fewer doesn't show an empty page. */
const clampPageIndex = (pageIndex: number, pageSize: number, total: number): number =>
  Math.min(pageIndex, Math.max(0, Math.ceil(total / pageSize) - 1));

interface TablePage<T> {
  pageIndex: number;
  pageSize: number;
  pagination: Pagination;
  onTableChange: (criteria: Criteria<T>) => void;
}

/**
 * An in-memory table's page, kept here rather than by the table. The table starts its own page over
 * whenever its rows are a new array, which they are on every render that filters them, such as one
 * that opens a flyout. Here, the page only starts over when `resetKey` changes, such as with a new
 * search or filter.
 */
export const useTablePage = <T>(resetKey: string, total: number): TablePage<T> => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  useEffect(() => setPageIndex(0), [resetKey]);

  const shownPageIndex = clampPageIndex(pageIndex, pageSize, total);
  return {
    pageIndex: shownPageIndex,
    pageSize,
    pagination: {
      pageIndex: shownPageIndex,
      pageSize,
      totalItemCount: total,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    },
    onTableChange: ({ page }) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
    },
  };
};
