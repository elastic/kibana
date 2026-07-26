/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { CriteriaWithPagination, Pagination } from '@elastic/eui';
import type {
  TemplatesFindRequest,
  TemplateSortField,
  TemplateListItem,
} from '../../../../common/types/api/template/v1';
import { PAGE_SIZE_OPTIONS } from '../constants';

export interface UseTemplatesPagination {
  queryParams: TemplatesFindRequest;
  setQueryParams: (params: Partial<TemplatesFindRequest>) => void;
  totalItemCount: number;
}

export type TemplatesPagination = Required<Pick<Pagination, 'pageIndex' | 'pageSize'>> &
  Pick<Pagination, 'totalItemCount' | 'pageSizeOptions'>;

export const useTemplatesPagination = ({
  queryParams,
  setQueryParams,
  totalItemCount,
}: UseTemplatesPagination) => {
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
    ({ page, sort }: CriteriaWithPagination<TemplateListItem>) => {
      const newParams: Partial<TemplatesFindRequest> = {};

      if (sort) {
        newParams.sortField = sort.field as TemplateSortField;
        newParams.sortOrder = sort.direction;
      }

      if (page) {
        newParams.page = page.index + 1;
        newParams.perPage = page.size;
      }

      setQueryParams(newParams);
    },
    [setQueryParams]
  );

  return {
    pagination,
    onTableChange,
  };
};
