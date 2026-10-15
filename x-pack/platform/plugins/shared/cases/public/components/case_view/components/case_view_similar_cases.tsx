/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { useGetSimilarCases, initialData } from '../../../containers/use_get_similar_cases';
import type { CaseUI } from '../../../../common/ui/types';

import {
  CASES_TABLE_PER_PAGE_VALUES,
  type CasesColumnSelection,
  type EuiBasicTableOnChange,
} from '../../all_cases/types';
import { ColumnsPopover } from '../../all_cases/components/columns_popover';
import { SimilarCasesTable } from '../../similar_cases/table';
import { useSimilarCasesColumnsSelection } from '../../similar_cases/use_similar_cases_columns_selection';
import { SidebarToggleButton } from './sidebar/sidebar_toggle_button';

const NAME_FIELD = 'title';

interface CaseViewSimilarCasesProps {
  caseData: CaseUI;
}

export const CaseViewSimilarCases = ({ caseData }: CaseViewSimilarCasesProps) => {
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(CASES_TABLE_PER_PAGE_VALUES[0]);

  const { selectedColumns, setSelectedColumns } = useSimilarCasesColumnsSelection();

  // The name column is always visible and first, so it is not offered in the column picker.
  const nameColumn = useMemo(
    () => ({
      ...(selectedColumns.find(({ field }) => field === NAME_FIELD) ?? {
        field: NAME_FIELD,
        name: '',
      }),
      isChecked: true,
    }),
    [selectedColumns]
  );

  const optionalColumns = useMemo(
    () => selectedColumns.filter(({ field }) => field !== NAME_FIELD),
    [selectedColumns]
  );

  const tableColumnsSelection = useMemo(
    () => [nameColumn, ...optionalColumns],
    [nameColumn, optionalColumns]
  );

  const onOptionalColumnsChange = useCallback(
    (newColumns: CasesColumnSelection[]) => setSelectedColumns([nameColumn, ...newColumns]),
    [nameColumn, setSelectedColumns]
  );

  const { data = initialData, isLoading: isLoadingCases } = useGetSimilarCases({
    caseId: caseData.id,
    page: pageIndex + 1,
    perPage: pageSize,
    enabled: true,
  });

  const tableOnChangeCallback = useCallback(({ page }: EuiBasicTableOnChange) => {
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

  return (
    // A plain block wrapper stops the parent column flex item from stretching the toolbar
    // and the table vertically when the sidebar is taller than the table content.
    <div>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        gutterSize="s"
        alignItems="center"
        css={{ paddingTop: euiTheme.size.s }}
        data-test-subj="similar-cases-table-toolbar"
      >
        <EuiFlexItem grow={false}>
          <ColumnsPopover
            selectedColumns={optionalColumns}
            onSelectedColumnsChange={onOptionalColumnsChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SidebarToggleButton />
        </EuiFlexItem>
      </EuiFlexGroup>
      <SimilarCasesTable
        isLoading={isLoadingCases}
        cases={data.cases}
        pagination={pagination}
        onChange={tableOnChangeCallback}
        selectedColumns={tableColumnsSelection}
      />
    </div>
  );
};

CaseViewSimilarCases.displayName = 'CaseViewSimilarCases';
