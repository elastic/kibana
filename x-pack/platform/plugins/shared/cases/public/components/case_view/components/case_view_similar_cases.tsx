/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import { useGetSimilarCases, initialData } from '../../../containers/use_get_similar_cases';
import type { CaseUI } from '../../../../common/ui/types';
import { SortFieldCase } from '../../../../common/ui/types';

import { CASES_TABLE_PER_PAGE_VALUES, type EuiBasicTableOnChange } from '../../all_cases/types';
import { SimilarCasesTable } from '../../similar_cases/table';
import { useSimilarCasesColumnsSelection } from '../../similar_cases/use_similar_cases_columns_selection';

interface CaseViewSimilarCasesProps {
  caseData: CaseUI;
}

export const CaseViewSimilarCases = ({ caseData }: CaseViewSimilarCasesProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(CASES_TABLE_PER_PAGE_VALUES[0]);
  const [sortField, setSortField] = useState<SortFieldCase>(SortFieldCase.createdAt);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { selectedColumns, setSelectedColumns } = useSimilarCasesColumnsSelection();

  const { data = initialData, isLoading: isLoadingCases } = useGetSimilarCases({
    caseId: caseData.id,
    page: pageIndex + 1,
    perPage: pageSize,
    enabled: true,
    sortField,
    sortOrder,
  });

  const tableOnChangeCallback = useCallback(({ page, sort }: EuiBasicTableOnChange) => {
    if (sort) {
      setSortField(sort.field as SortFieldCase);
      setSortOrder(sort.direction);
      setPageIndex(0);
    }
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: data.total ?? 0,
      pageSizeOptions: CASES_TABLE_PER_PAGE_VALUES,
    }),
    [data.total, pageIndex, pageSize]
  );

  const sorting = useMemo(
    () => ({ sort: { field: sortField, direction: sortOrder } }),
    [sortField, sortOrder]
  );

  return (
    <SimilarCasesTable
      isLoading={isLoadingCases}
      cases={data.cases}
      pagination={pagination}
      onChange={tableOnChangeCallback}
      selectedColumns={selectedColumns}
      onSelectedColumnsChange={setSelectedColumns}
      sorting={sorting}
    />
  );
};

CaseViewSimilarCases.displayName = 'CaseViewSimilarCases';
