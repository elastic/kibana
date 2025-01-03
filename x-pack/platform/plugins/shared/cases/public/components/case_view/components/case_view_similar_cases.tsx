/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { useGetSimilarCases, initialData } from '../../../containers/use_get_similar_cases';
import type { CaseUI } from '../../../../common/ui/types';

import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import { CASES_TABLE_PER_PAGE_VALUES, type EuiBasicTableOnChange } from '../../all_cases/types';
import { SimilarCasesTable } from '../../similar_cases/table';

interface CaseViewSimilarCasesProps {
  caseData: CaseUI;
}

export const CaseViewSimilarCases = ({ caseData }: CaseViewSimilarCasesProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(CASES_TABLE_PER_PAGE_VALUES[0]);

  const { data = initialData, isFetching: isLoadingCases } = useGetSimilarCases({
    caseId: caseData.id,
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const tableOnChangeCallback = useCallback(({ page, sort }: EuiBasicTableOnChange) => {
    setPageIndex(page.index);
    setPageSize(page.size);
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

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.SIMILAR_CASES} />
        <EuiFlexGroup>
          <EuiFlexItem>
            <SimilarCasesTable
              isLoading={isLoadingCases}
              cases={data.cases}
              pagination={pagination}
              onChange={tableOnChangeCallback}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewSimilarCases.displayName = 'CaseViewObservables';
