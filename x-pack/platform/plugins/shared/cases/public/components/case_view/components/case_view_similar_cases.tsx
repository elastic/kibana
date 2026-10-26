/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { useGetSimilarCases, initialData } from '../../../containers/use_get_similar_cases';
import type { CaseUI, SortOrder } from '../../../../common/ui/types';
import { SortFieldCase } from '../../../../common/ui/types';

import {
  CASES_TABLE_PER_PAGE_VALUES,
  type CasesColumnSelection,
  type EuiBasicTableOnChange,
} from '../../all_cases/types';
import { ColumnsPopover } from '../../all_cases/components/columns_popover';
import { SimilarCasesTable } from '../../similar_cases/table';
import { useSimilarCasesColumnsSelection } from '../../similar_cases/use_similar_cases_columns_selection';
import { SidebarToggleButton } from './sidebar/sidebar_toggle_button';

const DEFAULT_SORT_FIELD = SortFieldCase.createdAt;
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const isSortFieldCase = (field: unknown): field is SortFieldCase =>
  Object.values<unknown>(SortFieldCase).includes(field);

interface CaseViewSimilarCasesProps {
  caseData: CaseUI;
}

export const CaseViewSimilarCases = ({ caseData }: CaseViewSimilarCasesProps) => {
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(CASES_TABLE_PER_PAGE_VALUES[0]);
  const [sortField, setSortField] = useState<SortFieldCase>(DEFAULT_SORT_FIELD);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);

  const { pickerColumns, tableColumns, setPickerColumns } = useSimilarCasesColumnsSelection();

  const { data = initialData, isLoading: isLoadingCases } = useGetSimilarCases({
    caseId: caseData.id,
    page: pageIndex + 1,
    perPage: pageSize,
    enabled: true,
    sortField,
    sortOrder,
  });

  const tableOnChangeCallback = useCallback(({ page, sort }: EuiBasicTableOnChange) => {
    if (sort && isSortFieldCase(sort.field)) {
      setSortField(sort.field);
      setSortOrder(sort.direction);
    }
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  const onPickerColumnsChange = useCallback(
    (columns: CasesColumnSelection[]) => {
      setPickerColumns(columns);

      const isSortedColumnHidden = columns.some(
        ({ field, isChecked }) => field === sortField && !isChecked
      );

      if (!isSortedColumnHidden) {
        return;
      }

      const isDefaultSort = sortField === DEFAULT_SORT_FIELD && sortOrder === DEFAULT_SORT_ORDER;

      if (isDefaultSort) {
        return;
      }

      setSortField(DEFAULT_SORT_FIELD);
      setSortOrder(DEFAULT_SORT_ORDER);
      setPageIndex(0);
    },
    [setPickerColumns, sortField, sortOrder]
  );

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
            selectedColumns={pickerColumns}
            onSelectedColumnsChange={onPickerColumnsChange}
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
        selectedColumns={tableColumns}
        sorting={sorting}
      />
    </div>
  );
};

CaseViewSimilarCases.displayName = 'CaseViewSimilarCases';
