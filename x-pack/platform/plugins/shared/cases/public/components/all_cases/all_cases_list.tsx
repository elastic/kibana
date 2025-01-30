/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiTableSelectionType } from '@elastic/eui';
import { EuiProgress, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import deepEqual from 'react-fast-compare';

import type { CaseUI, FilterOptions, CasesUI } from '../../../common/ui/types';
import type { EuiBasicTableOnChange } from './types';

import { SortFieldCase } from '../../../common/ui/types';
import type { CaseStatuses } from '../../../common/types/domain';
import { useCasesColumns } from './use_cases_columns';
import { CasesTableFilters } from './table_filters';
import { CASES_TABLE_PER_PAGE_VALUES } from './types';
import { CasesTable } from './table';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CasesMetrics } from './cases_metrics';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { initialData, useGetCases } from '../../containers/use_get_cases';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { getAllPermissionsExceptFrom, isReadOnlyPermissions } from '../../utils/permissions';
import { useIsLoadingCases } from './use_is_loading_cases';
import { useAllCasesState } from './use_all_cases_state';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesColumnsSelection } from './use_cases_columns_selection';
import { DEFAULT_CASES_TABLE_STATE } from '../../containers/constants';
import { CasesTableUtilityBar } from './utility_bar';

const getSortField = (field: string): SortFieldCase =>
  // @ts-ignore
  SortFieldCase[field] ?? SortFieldCase.title;

export interface AllCasesListProps {
  hiddenStatuses?: CaseStatuses[];
  isSelectorView?: boolean;
  onRowClick?: (theCase?: CaseUI, isCreateCase?: boolean) => void;
}

export const AllCasesList = React.memo<AllCasesListProps>(
  ({ hiddenStatuses = [], isSelectorView = false, onRowClick }) => {
    const { owner, permissions } = useCasesContext();

    const availableSolutions = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
    const isLoading = useIsLoadingCases();
    const { euiTheme } = useEuiTheme();

    const hasOwner = !!owner.length;

    const { queryParams, setQueryParams, filterOptions, setFilterOptions } =
      useAllCasesState(isSelectorView);

    const [selectedCases, setSelectedCases] = useState<CasesUI>([]);

    const { data = initialData, isFetching: isLoadingCases } = useGetCases({
      filterOptions,
      queryParams,
    });

    const assigneesFromCases = useMemo(() => {
      return data.cases.reduce<Set<string>>((acc, caseInfo) => {
        if (!caseInfo) {
          return acc;
        }

        for (const assignee of caseInfo.assignees) {
          acc.add(assignee.uid);
        }
        return acc;
      }, new Set());
    }, [data.cases]);

    const { data: userProfiles } = useBulkGetUserProfiles({
      uids: Array.from(assigneesFromCases),
    });

    const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
      useGetCurrentUserProfile();

    const { data: connectors = [] } = useGetSupportedActionConnectors();

    const sorting = useMemo(
      () => ({
        sort: {
          field: queryParams.sortField,
          direction: queryParams.sortOrder,
        },
      }),
      [queryParams.sortField, queryParams.sortOrder]
    );

    const deselectCases = useCallback(() => {
      setSelectedCases([]);
    }, [setSelectedCases]);

    const tableOnChangeCallback = useCallback(
      ({ page, sort }: EuiBasicTableOnChange) => {
        let newQueryParams = queryParams;
        if (sort) {
          newQueryParams = {
            ...newQueryParams,
            sortField: getSortField(sort.field),
            sortOrder: sort.direction,
          };
        }
        if (page) {
          newQueryParams = {
            ...newQueryParams,
            page: page.index + 1,
            perPage: page.size,
          };
        }
        setQueryParams(newQueryParams);
        deselectCases();
      },
      [queryParams, deselectCases, setQueryParams]
    );

    const onFilterChangedCallback = useCallback(
      (newFilterOptions: Partial<FilterOptions>) => {
        deselectCases();
        setFilterOptions(newFilterOptions);
      },
      [deselectCases, setFilterOptions]
    );

    const { selectedColumns, setSelectedColumns } = useCasesColumnsSelection();

    const { columns, isLoadingColumns, rowHeader } = useCasesColumns({
      filterStatus: filterOptions.status ?? [],
      userProfiles: userProfiles ?? new Map(),
      isSelectorView,
      connectors,
      onRowClick,
      disableActions: selectedCases.length > 0,
      selectedColumns,
    });

    const pagination = useMemo(
      () => ({
        pageIndex: queryParams.page - 1,
        pageSize: queryParams.perPage,
        totalItemCount: data.total ?? 0,
        pageSizeOptions: CASES_TABLE_PER_PAGE_VALUES,
      }),
      [data, queryParams]
    );

    const euiBasicTableSelectionProps = useMemo<EuiTableSelectionType<CaseUI>>(
      () => ({
        onSelectionChange: setSelectedCases,
        selected: selectedCases,
        selectable: () => !isReadOnlyPermissions(permissions),
      }),
      [permissions, selectedCases]
    );
    const isDataEmpty = useMemo(() => data.total === 0, [data]);

    const tableRowProps = useCallback(
      (theCase: CaseUI) => ({
        'data-test-subj': `cases-table-row-${theCase.id}`,
      }),
      []
    );

    const onCreateCasePressed = useCallback(() => {
      onRowClick?.(undefined, true);
    }, [onRowClick]);

    const onClearFilters = useCallback(() => {
      setFilterOptions(DEFAULT_CASES_TABLE_STATE.filterOptions);
    }, [setFilterOptions]);

    const showClearFiltersButton = !deepEqual(
      DEFAULT_CASES_TABLE_STATE.filterOptions,
      filterOptions
    );

    return (
      <>
        <EuiProgress
          size="xs"
          color="accent"
          className="essentialAnimation"
          css={
            isLoading || isLoadingCases || isLoadingColumns
              ? css`
                  top: ${euiTheme.size.xxs};
                  border-radius: ${euiTheme.border.radius};
                  z-index: ${euiTheme.levels.header};
                `
              : css`
                  display: none;
                `
          }
        />

        {!isSelectorView ? <CasesMetrics /> : null}
        <CasesTableFilters
          countClosedCases={data.countClosedCases}
          countOpenCases={data.countOpenCases}
          countInProgressCases={data.countInProgressCases}
          onFilterChanged={onFilterChangedCallback}
          availableSolutions={hasOwner ? [] : availableSolutions}
          hiddenStatuses={hiddenStatuses}
          onCreateCasePressed={onCreateCasePressed}
          isSelectorView={isSelectorView}
          isLoading={isLoadingCurrentUserProfile}
          currentUserProfile={currentUserProfile}
          filterOptions={filterOptions}
        />
        <CasesTableUtilityBar
          pagination={pagination}
          isSelectorView={isSelectorView}
          totalCases={data.total ?? 0}
          selectedCases={selectedCases}
          deselectCases={deselectCases}
          selectedColumns={selectedColumns}
          onSelectedColumnsChange={setSelectedColumns}
          onClearFilters={onClearFilters}
          showClearFiltersButton={showClearFiltersButton}
        />
        <CasesTable
          columns={columns}
          rowHeader={rowHeader}
          data={data}
          goToCreateCase={onRowClick ? onCreateCasePressed : undefined}
          isCasesLoading={isLoadingCases}
          isLoadingColumns={isLoadingColumns}
          isCommentUpdating={isLoadingCases}
          isDataEmpty={isDataEmpty}
          isSelectorView={isSelectorView}
          onChange={tableOnChangeCallback}
          pagination={pagination}
          selection={euiBasicTableSelectionProps}
          sorting={sorting}
          tableRowProps={tableRowProps}
        />
      </>
    );
  }
);

AllCasesList.displayName = 'AllCasesList';
