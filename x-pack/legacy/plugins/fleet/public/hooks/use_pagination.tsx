/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { DEFAULT_AGENTS_PAGE_SIZE, AGENTS_PAGE_SIZE_OPTIONS } from '../../common/constants';

export function usePagination() {
  const [pagination, setPagination] = useState<{
    currentPage: number;
    pageSize: number;
  }>({
    currentPage: 1,
    pageSize: DEFAULT_AGENTS_PAGE_SIZE,
  });

  return {
    pagination,
    setPagination,
    pageSizeOptions: AGENTS_PAGE_SIZE_OPTIONS,
  };
}
