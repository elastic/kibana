/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { Criteria, EuiBasicTableColumn, EuiTableSelectionType } from '@elastic/eui';

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type { FindObservablesRequest } from '../../../common/types/api';
import type { Observable, ObservableType } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui';
import * as i18n from './translations';
import { AddObservable } from './add_observable';
import { ObservableActionsPopoverButton } from './observable_actions_popover_button';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useFindObservables } from '../../containers/use_find_observables';
import { ObservablesUtilityBar } from './observables_utility_bar';
import { useCanRunCaseWorkflow } from '../workflows/use_run_case_workflow';
import { useCasesContext } from '../cases_context/use_cases_context';

type ObservableSortField = NonNullable<FindObservablesRequest['sortField']>;

interface ObservablesSort {
  field: ObservableSortField;
  direction: 'asc' | 'desc';
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT: ObservablesSort = { field: 'createdAt', direction: 'asc' };
const SORT_FIELDS: ReadonlySet<string> = new Set<ObservableSortField>([
  'createdAt',
  'value',
  'typeKey',
]);

const isSortField = (field: string): field is ObservableSortField => SORT_FIELDS.has(field);

const getColumns = (
  caseData: CaseUI,
  observableTypes: ObservableType[],
  canRunWorkflow: boolean
): Array<EuiBasicTableColumn<Observable>> => [
  {
    name: i18n.OBSERVABLE_VALUE,
    field: 'value',
    sortable: true,
    'data-test-subj': 'cases-observables-table-value',
  },
  {
    name: i18n.OBSERVABLE_TYPE,
    field: 'typeKey',
    sortable: true,
    'data-test-subj': 'cases-observables-table-type',
    render: (typeKey: string) =>
      observableTypes.find((observableType) => observableType.key === typeKey)?.label || '-',
  },
  {
    name: i18n.OBSERVABLE_DESCRIPTION,
    field: 'description',
    'data-test-subj': 'cases-observables-table-description',
  },
  {
    name: i18n.DATE_ADDED,
    field: 'createdAt',
    sortable: true,
    'data-test-subj': 'cases-observables-table-date-added',
    dataType: 'date',
  },
  {
    name: i18n.OBSERVABLE_ACTIONS,
    field: 'actions',
    'data-test-subj': 'cases-observables-table-actions',
    width: '120px',
    actions: [
      {
        name: i18n.OBSERVABLE_ACTIONS,
        render: (observable: Observable) => {
          return (
            <ObservableActionsPopoverButton
              caseData={caseData}
              observable={observable}
              canRunWorkflow={canRunWorkflow}
            />
          );
        },
      },
    ],
  },
];

const EmptyObservablesTable = ({ caseData }: { caseData: CaseUI }) => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_OBSERVABLES}</h3>}
    data-test-subj="cases-observables-table-empty"
    titleSize="xs"
    actions={<AddObservable caseData={caseData} />}
  />
);

EmptyObservablesTable.displayName = 'EmptyObservablesTable';

export interface ObservablesTableProps {
  caseData: CaseUI;
  isLoading: boolean;
  searchTerm?: string;
  onExtractObservablesChanged: (isOn: boolean) => void;
}

/**
 * A case can hold up to 100,000 observables, so the table reads one page at a time from the
 * server. Pages move with a cursor (previous / next), and sorting and value search run on the
 * server too.
 */
export const ObservablesTable = ({
  caseData,
  isLoading,
  searchTerm,
  onExtractObservablesChanged,
}: ObservablesTableProps) => {
  const canRunWorkflow = useCanRunCaseWorkflow();
  const { permissions } = useCasesContext();
  const canSelectObservables = canRunWorkflow || permissions.update;

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<ObservablesSort>(DEFAULT_SORT);
  // cursors[i] fetches page i; the first page needs none.
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const pageIndex = cursors.length - 1;
  const cursor = cursors[pageIndex];

  useEffect(() => {
    setCursors([undefined]);
  }, [searchTerm]);

  const {
    data,
    isFetching,
    isLoading: isLoadingObservables,
  } = useFindObservables(caseData.id, {
    perPage: pageSize,
    sortField: sort.field,
    sortOrder: sort.direction,
    ...(cursor != null && { cursor }),
    ...(searchTerm && { search: searchTerm }),
  });

  const items = useMemo(() => data?.observables ?? [], [data?.observables]);
  const total = data?.total ?? 0;
  const firstItem = pageIndex * pageSize + 1;
  const lastItem = pageIndex * pageSize + items.length;
  const nextCursor = data?.cursor;
  const hasNextPage = nextCursor != null && lastItem < total;

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  // Only the current page can be selected. Drop ids that leave it, so an observable that is no
  // longer shown does not stay a bulk target.
  useEffect(() => {
    setSelectedIds((previous) => {
      const displayedIds = new Set(items.map(({ id }) => id));
      const next = new Set([...previous].filter((id) => displayedIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [items]);

  const selected = useMemo(
    () => items.filter(({ id }) => selectedIds.has(id)),
    [items, selectedIds]
  );

  const onSelectionChange = useCallback(
    (selectedItems: Observable[]) => setSelectedIds(new Set(selectedItems.map(({ id }) => id))),
    []
  );

  const onBulkActionSuccess = useCallback(() => setSelectedIds(new Set()), []);

  const selection: EuiTableSelectionType<Observable> | undefined = useMemo(
    () => (canSelectObservables ? { selected, onSelectionChange } : undefined),
    [canSelectObservables, onSelectionChange, selected]
  );

  const onTableChange = useCallback(({ sort: nextSort }: Criteria<Observable>) => {
    if (nextSort == null || !isSortField(nextSort.field)) {
      return;
    }
    setSort({ field: nextSort.field, direction: nextSort.direction });
    setCursors([undefined]);
  }, []);

  const onPageSizeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setCursors([undefined]);
  }, []);

  const goToPreviousPage = useCallback(
    () => setCursors((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous)),
    []
  );

  const goToNextPage = useCallback(() => {
    if (nextCursor != null) {
      setCursors((previous) => [...previous, nextCursor]);
    }
  }, [nextCursor]);

  const filesTableRowProps = useCallback(
    (observable: Observable) => ({
      'data-test-subj': `cases-observables-table-row-${observable.id}`,
    }),
    []
  );

  const { data: currentConfiguration, isLoading: loadingCaseConfigure } = useGetCaseConfiguration();

  const observableTypes = useMemo(
    () => [...OBSERVABLE_TYPES_BUILTIN, ...currentConfiguration.observableTypes],
    [currentConfiguration.observableTypes]
  );
  const columns = useMemo(
    () => getColumns(caseData, observableTypes, canRunWorkflow),
    [caseData, observableTypes, canRunWorkflow]
  );

  const pageSizeOptions = useMemo(
    () => PAGE_SIZE_OPTIONS.map((size) => ({ value: size, text: `${size}` })),
    []
  );

  return isLoading || loadingCaseConfigure || isLoadingObservables ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText data-test-subj="cases-observables-table-loading" lines={10} />
    </>
  ) : (
    <>
      <ObservablesUtilityBar
        caseData={caseData}
        totalObservables={total}
        isLoading={isLoading}
        onExtractObservablesChanged={onExtractObservablesChanged}
        selectedObservables={selected}
        canRunWorkflow={canRunWorkflow}
        onBulkActionSuccess={onBulkActionSuccess}
      />
      <EuiSpacer size="xs" />
      <EuiBasicTable
        tableCaption={i18n.OBSERVABLES_TABLE}
        items={items}
        itemId="id"
        rowHeader="id"
        columns={columns}
        loading={isFetching}
        sorting={{ sort }}
        onChange={onTableChange}
        data-test-subj="cases-observables-table"
        noItemsMessage={<EmptyObservablesTable caseData={caseData} />}
        rowProps={filesTableRowProps}
        selection={selection}
      />
      {total > 0 && (
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          data-test-subj="cases-observables-table-pagination"
        >
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              prepend={i18n.OBSERVABLES_ROWS_PER_PAGE}
              aria-label={i18n.OBSERVABLES_ROWS_PER_PAGE}
              options={pageSizeOptions}
              value={pageSize}
              onChange={onPageSizeChange}
              data-test-subj="cases-observables-table-page-size"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" data-test-subj="cases-observables-table-page-range">
                  {i18n.OBSERVABLES_PAGE_RANGE(firstItem, lastItem, total)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.OBSERVABLES_PREVIOUS_PAGE} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="chevronSingleLeft"
                    aria-label={i18n.OBSERVABLES_PREVIOUS_PAGE}
                    isDisabled={pageIndex === 0 || isFetching}
                    onClick={goToPreviousPage}
                    data-test-subj="cases-observables-table-previous-page"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.OBSERVABLES_NEXT_PAGE} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="chevronSingleRight"
                    aria-label={i18n.OBSERVABLES_NEXT_PAGE}
                    isDisabled={!hasNextPage || isFetching}
                    onClick={goToNextPage}
                    data-test-subj="cases-observables-table-next-page"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};

ObservablesTable.displayName = 'ObservablesTable';
