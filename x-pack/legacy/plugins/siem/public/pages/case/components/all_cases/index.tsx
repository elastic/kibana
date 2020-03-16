/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiProgress,
  EuiTableSortingType,
} from '@elastic/eui';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import styled, { css } from 'styled-components';
import * as i18n from './translations';

import { getCasesColumns } from './columns';
import { Case, FilterOptions, SortFieldCase } from '../../../../containers/case/types';
import { useGetCases, UpdateCase } from '../../../../containers/case/use_get_cases';
import { useGetCasesStatus } from '../../../../containers/case/use_get_cases_status';
import { useDeleteCases } from '../../../../containers/case/use_delete_cases';
import { EuiBasicTableOnChange } from '../../../detection_engine/rules/types';
import { Panel } from '../../../../components/panel';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/utility_bar';
import { getConfigureCasesUrl, getCreateCaseUrl } from '../../../../components/link_to';

import { getBulkItems } from '../bulk_actions';
import { CaseHeaderPage } from '../case_header_page';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { OpenClosedStats } from '../open_closed_stats';

import { getActions } from './actions';
import { CasesTableFilters } from './table_filters';

const Div = styled.div`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
`;
const FlexItemDivider = styled(EuiFlexItem)`
  ${({ theme }) => css`
    .euiFlexGroup--gutterMedium > &.euiFlexItem {
      border-right: ${theme.eui.euiBorderThin};
      padding-right: ${theme.eui.euiSize};
      margin-right: ${theme.eui.euiSize};
    }
  `}
`;

const ProgressLoader = styled(EuiProgress)`
  ${({ theme }) => css`
    top: 2px;
    border-radius: ${theme.eui.euiBorderRadius};
    z-index: ${theme.eui.euiZHeader};
  `}
`;

const getSortField = (field: string): SortFieldCase => {
  if (field === SortFieldCase.createdAt) {
    return SortFieldCase.createdAt;
  } else if (field === SortFieldCase.updatedAt) {
    return SortFieldCase.updatedAt;
  }
  return SortFieldCase.createdAt;
};
export const AllCases = React.memo(() => {
  const {
    countClosedCases,
    countOpenCases,
    isLoading: isCasesStatusLoading,
    fetchCasesStatus,
  } = useGetCasesStatus();
  const {
    data,
    dispatchUpdateCaseProperty,
    filterOptions,
    loading,
    queryParams,
    selectedCases,
    refetchCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  } = useGetCases();

  // Delete case
  const {
    dispatchResetIsDeleted,
    handleOnDeleteConfirm,
    handleToggleModal,
    isLoading: isDeleting,
    isDeleted,
    isDisplayConfirmDeleteModal,
  } = useDeleteCases();

  useEffect(() => {
    if (isDeleted) {
      refetchCases(filterOptions, queryParams);
      fetchCasesStatus();
      dispatchResetIsDeleted();
    }
  }, [isDeleted, filterOptions, queryParams]);

  const [deleteThisCase, setDeleteThisCase] = useState({
    title: '',
    id: '',
  });
  const [deleteBulk, setDeleteBulk] = useState<string[]>([]);
  const confirmDeleteModal = useMemo(
    () => (
      <ConfirmDeleteCaseModal
        caseTitle={deleteThisCase.title}
        isModalVisible={isDisplayConfirmDeleteModal}
        isPlural={deleteBulk.length > 0}
        onCancel={handleToggleModal}
        onConfirm={handleOnDeleteConfirm.bind(
          null,
          deleteBulk.length > 0 ? deleteBulk : [deleteThisCase.id]
        )}
      />
    ),
    [deleteBulk, deleteThisCase, isDisplayConfirmDeleteModal]
  );

  const toggleDeleteModal = useCallback(
    (deleteCase: Case) => {
      handleToggleModal();
      setDeleteThisCase(deleteCase);
    },
    [isDisplayConfirmDeleteModal]
  );

  const toggleBulkDeleteModal = useCallback(
    (deleteCases: string[]) => {
      handleToggleModal();
      setDeleteBulk(deleteCases);
    },
    [isDisplayConfirmDeleteModal]
  );

  const selectedCaseIds = useMemo(
    (): string[] =>
      selectedCases.reduce((arr: string[], caseObj: Case) => [...arr, caseObj.id], []),
    [selectedCases]
  );

  const getBulkItemsPopoverContent = useCallback(
    (closePopover: () => void) => (
      <EuiContextMenuPanel
        items={getBulkItems({
          closePopover,
          deleteCasesAction: toggleBulkDeleteModal,
          selectedCaseIds,
          caseStatus: filterOptions.status,
        })}
      />
    ),
    [selectedCaseIds, filterOptions.status, toggleBulkDeleteModal]
  );
  const handleDispatchUpdate = useCallback(
    (args: Omit<UpdateCase, 'refetchCasesStatus'>) => {
      dispatchUpdateCaseProperty({ ...args, refetchCasesStatus: fetchCasesStatus });
    },
    [dispatchUpdateCaseProperty, fetchCasesStatus]
  );

  const actions = useMemo(
    () =>
      getActions({
        caseStatus: filterOptions.status,
        deleteCaseOnClick: toggleDeleteModal,
        dispatchUpdate: handleDispatchUpdate,
      }),
    [filterOptions.status, toggleDeleteModal, handleDispatchUpdate]
  );

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
    },
    [setQueryParams, queryParams]
  );

  const onFilterChangedCallback = useCallback(
    (newFilterOptions: Partial<FilterOptions>) => {
      setFilters({ ...filterOptions, ...newFilterOptions });
    },
    [filterOptions, setFilters]
  );

  const memoizedGetCasesColumns = useMemo(() => getCasesColumns(actions), [actions]);
  const memoizedPagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      totalItemCount: data.total,
      pageSizeOptions: [5, 10, 15, 20, 25],
    }),
    [data, queryParams]
  );

  const sorting: EuiTableSortingType<Case> = {
    sort: { field: queryParams.sortField, direction: queryParams.sortOrder },
  };
  const euiBasicTableSelectionProps = useMemo<EuiTableSelectionType<Case>>(
    () => ({
      selectable: (item: Case) => true,
      onSelectionChange: setSelectedCases,
    }),
    [selectedCases]
  );
  const isCasesLoading = useMemo(
    () => loading.indexOf('cases') > -1 || loading.indexOf('caseUpdate') > -1,
    [loading]
  );
  const isDataEmpty = useMemo(() => data.total === 0, [data]);
  return (
    <>
      <CaseHeaderPage title={i18n.PAGE_TITLE}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap={true}>
          <EuiFlexItem grow={false}>
            <OpenClosedStats
              caseCount={countOpenCases}
              caseStatus={'open'}
              isLoading={isCasesStatusLoading}
            />
          </EuiFlexItem>
          <FlexItemDivider grow={false}>
            <OpenClosedStats
              caseCount={countClosedCases}
              caseStatus={'closed'}
              isLoading={isCasesStatusLoading}
            />
          </FlexItemDivider>
          <EuiFlexItem grow={false}>
            <EuiButton href={getConfigureCasesUrl()} iconType="controlsHorizontal">
              {i18n.CONFIGURE_CASES_BUTTON}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill href={getCreateCaseUrl()} iconType="plusInCircle">
              {i18n.CREATE_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </CaseHeaderPage>
      {(isCasesLoading || isDeleting) && !isDataEmpty && (
        <ProgressLoader size="xs" color="accent" className="essentialAnimation" />
      )}
      <Panel loading={isCasesLoading}>
        <CasesTableFilters
          countClosedCases={data.countClosedCases}
          countOpenCases={data.countOpenCases}
          onFilterChanged={onFilterChangedCallback}
          initial={{
            search: filterOptions.search,
            reporters: filterOptions.reporters,
            tags: filterOptions.tags,
            status: filterOptions.status,
          }}
        />
        {isCasesLoading && isDataEmpty ? (
          <Div>
            <EuiLoadingContent data-test-subj="initialLoadingPanelAllCases" lines={10} />
          </Div>
        ) : (
          <Div>
            <UtilityBar border>
              <UtilityBarSection>
                <UtilityBarGroup>
                  <UtilityBarText data-test-subj="case-table-case-count">
                    {i18n.SHOWING_CASES(data.total ?? 0)}
                  </UtilityBarText>
                </UtilityBarGroup>
                <UtilityBarGroup>
                  <UtilityBarText data-test-subj="case-table-selected-case-count">
                    {i18n.SHOWING_SELECTED_CASES(selectedCases.length)}
                  </UtilityBarText>
                  <UtilityBarAction
                    iconSide="right"
                    iconType="arrowDown"
                    popoverContent={getBulkItemsPopoverContent}
                  >
                    {i18n.BULK_ACTIONS}
                  </UtilityBarAction>
                </UtilityBarGroup>
              </UtilityBarSection>
            </UtilityBar>
            <EuiBasicTable
              columns={memoizedGetCasesColumns}
              isSelectable
              itemId="id"
              items={data.cases}
              noItemsMessage={
                <EuiEmptyPrompt
                  title={<h3>{i18n.NO_CASES}</h3>}
                  titleSize="xs"
                  body={i18n.NO_CASES_BODY}
                  actions={
                    <EuiButton fill size="s" href={getCreateCaseUrl()} iconType="plusInCircle">
                      {i18n.ADD_NEW_CASE}
                    </EuiButton>
                  }
                />
              }
              onChange={tableOnChangeCallback}
              pagination={memoizedPagination}
              selection={euiBasicTableSelectionProps}
              sorting={sorting}
            />
          </Div>
        )}
      </Panel>
      {confirmDeleteModal}
    </>
  );
});

AllCases.displayName = 'AllCases';
