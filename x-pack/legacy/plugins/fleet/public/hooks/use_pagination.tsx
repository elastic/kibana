/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZES = [2, 20, 50];

export function usePagination() {
  const [pageIndex, setCurrentPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  return {
    pageIndex,
    setCurrentPageIndex,
    pageSize,
    pageSizes: PAGE_SIZES,
    setPageSize,
  };
}
