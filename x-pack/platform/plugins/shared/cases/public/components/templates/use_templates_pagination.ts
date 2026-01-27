/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { CriteriaWithPagination, Pagination } from '@elastic/eui';
import type { Template } from './sample_data';
import type { QueryParams } from './use_templates_state';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface UseTemplatesPagination {
  queryParams: QueryParams;
  setQueryParams: (params: Partial<QueryParams>) => void;
  totalItemCount: number;
}

export type TemplatesPagination = Required<Pick<Pagination, 'pageIndex' | 'pageSize'>> &
  Pick<Pagination, 'totalItemCount' | 'pageSizeOptions'>;

export interface UseTemplatesPaginationReturnValue {
  pagination: TemplatesPagination;
  onTableChange: (criteria: CriteriaWithPagination<Template>) => void;
}

export const useTemplatesPagination = ({
  queryParams,
  setQueryParams,
  totalItemCount,
}: UseTemplatesPagination): UseTemplatesPaginationReturnValue => {
  const pagination: TemplatesPagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      totalItemCount,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    }),
    [queryParams, totalItemCount]
  );

  const onTableChange = useCallback(
    ({ page }: CriteriaWithPagination<Template>) => {
      if (page) {
        setQueryParams({ page: page.index + 1, perPage: page.size });
      }
    },
    [setQueryParams]
  );

  return {
    pagination,
    onTableChange,
  };
};
