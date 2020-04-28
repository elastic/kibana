/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { isEmpty } from 'lodash/fp';
import styled, { css } from 'styled-components';
import * as i18n from './translations';

import { getCasesColumns } from './columns';
import { Case, DeleteCase, FilterOptions, SortFieldCase } from '../../../../containers/case/types';
import { useGetCases, UpdateCase } from '../../../../containers/case/use_get_cases';
import { useGetCasesStatus } from '../../../../containers/case/use_get_cases_status';
import { useDeleteCases } from '../../../../containers/case/use_delete_cases';
import { EuiBasicTableOnChange } from '../../../detection_engine/rules/types';
import { useGetUrlSearch } from '../../../../components/navigation/use_get_url_search';
import { Panel } from '../../../../components/panel';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/utility_bar';
import { getCreateCaseUrl } from '../../../../components/link_to';
import { getBulkItems } from '../bulk_actions';
import { CaseHeaderPage } from '../case_header_page';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { OpenClosedStats } from '../open_closed_stats';
import { navTabs } from '../../../home/home_navigations';

import { getActions } from './actions';
import { CasesTableFilters } from './table_filters';
import { useUpdateCases } from '../../../../containers/case/use_bulk_update_case';
import { useGetActionLicense } from '../../../../containers/case/use_get_action_license';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { CaseCallOut } from '../callout';
import { ConfigureCaseButton } from '../configure_cases/button';
import { ERROR_PUSH_SERVICE_CALLOUT_TITLE } from '../use_push_to_service/translations';

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
  } else if (field === SortFieldCase.closedAt) {
    return SortFieldCase.closedAt;
  }
  return SortFieldCase.createdAt;
};

interface AllCasesProps {
  userCanCrud: boolean;
}
export const AllCases = React.memo<AllCasesProps>(({ userCanCrud }) => {
  const urlSearch = useGetUrlSearch(navTabs.case);
  const { actionLicense } = useGetActionLicense();
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

  // Update case
  const {
    dispatchResetIsUpdated,
    isLoading: isUpdating,
    isUpdated,
    updateBulkStatus,
  } = useUpdateCases();
  const [deleteThisCase, setDeleteThisCase] = useState({
    title: '',
    id: '',
  });
  const [deleteBulk, setDeleteBulk] = useState<DeleteCase[]>([]);
  const filterRefetch = useRef<() => void>();
  const setFilterRefetch = useCallback(
    (refetchFilter: () => void) => {
      filterRefetch.current = refetchFilter;
    },
    [filterRefetch.current]
  );
  const refreshCases = useCallback(
    (dataRefresh = true) => {
      if (dataRefresh) refetchCases();
      fetchCasesStatus();
      setSelectedCases([]);
      setDeleteBulk([]);
      if (filterRefetch.current != null) {
        filterRefetch.current();
      }
    },
    [filterOptions, queryParams, filterRefetch.current]
  );

  useEffect(() => {
    if (isDeleted) {
      refreshCases();
      dispatchResetIsDeleted();
    }
    if (isUpdated) {
      refreshCases();
      dispatchResetIsUpdated();
    }
  }, [isDeleted, isUpdated]);
  const confirmDeleteModal = useMemo(
    () => (
      <ConfirmDeleteCaseModal
        caseTitle={deleteThisCase.title}
        isModalVisible={isDisplayConfirmDeleteModal}
        isPlural={deleteBulk.length > 0}
        onCancel={handleToggleModal}
        onConfirm={handleOnDeleteConfirm.bind(
          null,
          deleteBulk.length > 0 ? deleteBulk : [deleteThisCase]
        )}
      />
    ),
    [deleteBulk, deleteThisCase, isDisplayConfirmDeleteModal]
  );

  const toggleDeleteModal = useCallback((deleteCase: Case) => {
    handleToggleModal();
    setDeleteThisCase(deleteCase);
  }, []);

  const toggleBulkDeleteModal = useCallback(
    (caseIds: string[]) => {
      handleToggleModal();
      if (caseIds.length === 1) {
        const singleCase = selectedCases.find(theCase => theCase.id === caseIds[0]);
        if (singleCase) {
          return setDeleteThisCase({ id: singleCase.id, title: singleCase.title });
        }
      }
      const convertToDeleteCases: DeleteCase[] = caseIds.map(id => ({ id }));
      setDeleteBulk(convertToDeleteCases);
    },
    [selectedCases]
  );

  const handleUpdateCaseStatus = useCallback(
    (status: string) => {
      updateBulkStatus(selectedCases, status);
    },
    [selectedCases]
  );

  const selectedCaseIds = useMemo(
    (): string[] => selectedCases.map((caseObj: Case) => caseObj.id),
    [selectedCases]
  );

  const getBulkItemsPopoverContent = useCallback(
    (closePopover: () => void) => (
      <EuiContextMenuPanel
        data-test-subj="cases-bulk-actions"
        items={getBulkItems({
          caseStatus: filterOptions.status,
          closePopover,
          deleteCasesAction: toggleBulkDeleteModal,
          selectedCaseIds,
          updateCaseStatus: handleUpdateCaseStatus,
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

  const actionsErrors = useMemo(() => getActionLicenseError(actionLicense), [actionLicense]);

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
      refreshCases(false);
    },
    [queryParams]
  );

  const onFilterChangedCallback = useCallback(
    (newFilterOptions: Partial<FilterOptions>) => {
      if (newFilterOptions.status && newFilterOptions.status === 'closed') {
        setQueryParams({ sortField: SortFieldCase.closedAt });
      } else if (newFilterOptions.status && newFilterOptions.status === 'open') {
        setQueryParams({ sortField: SortFieldCase.createdAt });
      }
      setFilters(newFilterOptions);
      refreshCases(false);
    },
    [filterOptions, queryParams]
  );

  const memoizedGetCasesColumns = useMemo(
    () => getCasesColumns(userCanCrud ? actions : [], filterOptions.status),
    [actions, filterOptions.status, userCanCrud]
  );
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
    () => ({ onSelectionChange: setSelectedCases }),
    [selectedCases]
  );
  const isCasesLoading = useMemo(
    () => loading.indexOf('cases') > -1 || loading.indexOf('caseUpdate') > -1,
    [loading]
  );
  const isDataEmpty = useMemo(() => data.total === 0, [data]);

  return (
    <>
      {!isEmpty(actionsErrors) && (
        <CaseCallOut title={ERROR_PUSH_SERVICE_CALLOUT_TITLE} messages={actionsErrors} />
      )}
      <CaseHeaderPage title={i18n.PAGE_TITLE}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap={true}>
          <EuiFlexItem grow={false}>
            <OpenClosedStats
              dataTestSubj="openStatsHeader"
              caseCount={countOpenCases}
              caseStatus={'open'}
              isLoading={isCasesStatusLoading}
            />
          </EuiFlexItem>
          <FlexItemDivider grow={false}>
            <OpenClosedStats
              dataTestSubj="closedStatsHeader"
              caseCount={countClosedCases}
              caseStatus={'closed'}
              isLoading={isCasesStatusLoading}
            />
          </FlexItemDivider>
          <EuiFlexItem grow={false}>
            <ConfigureCaseButton
              label={i18n.CONFIGURE_CASES_BUTTON}
              isDisabled={!isEmpty(actionsErrors) || !userCanCrud}
              showToolTip={!isEmpty(actionsErrors)}
              msgTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].description : <></>}
              titleTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].title : ''}
              urlSearch={urlSearch}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={!userCanCrud}
              fill
              href={getCreateCaseUrl(urlSearch)}
              iconType="plusInCircle"
              data-test-subj="createNewCaseBtn"
            >
              {i18n.CREATE_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </CaseHeaderPage>
      {(isCasesLoading || isDeleting || isUpdating) && !isDataEmpty && (
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
          setFilterRefetch={setFilterRefetch}
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
                  {userCanCrud && (
                    <UtilityBarAction
                      data-test-subj="case-table-bulk-actions"
                      iconSide="right"
                      iconType="arrowDown"
                      popoverContent={getBulkItemsPopoverContent}
                    >
                      {i18n.BULK_ACTIONS}
                    </UtilityBarAction>
                  )}
                  <UtilityBarAction iconSide="left" iconType="refresh" onClick={refreshCases}>
                    {i18n.REFRESH}
                  </UtilityBarAction>
                </UtilityBarGroup>
              </UtilityBarSection>
            </UtilityBar>
            <EuiBasicTable
              columns={memoizedGetCasesColumns}
              data-test-subj="cases-table"
              isSelectable={userCanCrud}
              itemId="id"
              items={data.cases}
              noItemsMessage={
                <EuiEmptyPrompt
                  title={<h3>{i18n.NO_CASES}</h3>}
                  titleSize="xs"
                  body={i18n.NO_CASES_BODY}
                  actions={
                    <EuiButton
                      isDisabled={!userCanCrud}
                      fill
                      size="s"
                      href={getCreateCaseUrl(urlSearch)}
                      iconType="plusInCircle"
                    >
                      {i18n.ADD_NEW_CASE}
                    </EuiButton>
                  }
                />
              }
              onChange={tableOnChangeCallback}
              pagination={memoizedPagination}
              selection={userCanCrud ? euiBasicTableSelectionProps : {}}
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
