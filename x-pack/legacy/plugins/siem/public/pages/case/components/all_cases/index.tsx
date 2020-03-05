/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
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

import { useGetCases } from '../../../../containers/case/use_get_cases';
import { EuiBasicTableOnChange } from '../../../detection_engine/rules/types';
import { Panel } from '../../../../components/panel';
import { CasesTableFilters } from './table_filters';

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
import { OpenClosedStats } from '../open_closed_stats';
import { getActions } from './actions';

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
    .euiFlexGroup--gutterMedium > &.euiFlexItem {
      top: 2px;
      border-radius: ${theme.eui.euiBorderRadius};
      z-index: ${theme.eui.euiZHeader};
    }
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
    caseCount,
    data,
    dispatchUpdateCaseProperty,
    filterOptions,
    getCaseCount,
    loading,
    queryParams,
    selectedCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  } = useGetCases();

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

  const actions = useMemo(
    () =>
      getActions({ caseStatus: filterOptions.state, dispatchUpdate: dispatchUpdateCaseProperty }),
    [filterOptions.state, dispatchUpdateCaseProperty]
  );

  const memoizedGetCasesColumns = useMemo(() => getCasesColumns(actions), [filterOptions.state]);
  const memoizedPagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      totalItemCount: data.total,
      pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
    }),
    [data, queryParams]
  );

  const getBulkItemsPopoverContent = useCallback(
    (closePopover: () => void) => (
      <EuiContextMenuPanel
        items={getBulkItems({
          closePopover,
          selectedCases,
          caseStatus: filterOptions.state,
        })}
      />
    ),
    [selectedCases, filterOptions.state]
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
              caseCount={caseCount}
              caseState={'open'}
              getCaseCount={getCaseCount}
              isLoading={loading.indexOf('caseCount') > -1}
            />
          </EuiFlexItem>
          <FlexItemDivider grow={false}>
            <OpenClosedStats
              caseCount={caseCount}
              caseState={'closed'}
              getCaseCount={getCaseCount}
              isLoading={loading.indexOf('caseCount') > -1}
            />
          </FlexItemDivider>
          <EuiFlexItem grow={false}>
            <EuiButton fill href={getCreateCaseUrl()} iconType="plusInCircle">
              {i18n.CREATE_TITLE}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={i18n.CONFIGURE_CASES_BUTTON}
              href={getConfigureCasesUrl()}
              iconType="gear"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </CaseHeaderPage>
      {isCasesLoading && !isDataEmpty && <ProgressLoader size="xs" color="accent" />}
      <Panel loading={isCasesLoading}>
        <CasesTableFilters
          onFilterChanged={onFilterChangedCallback}
          initial={{
            search: filterOptions.search,
            tags: filterOptions.tags,
            state: filterOptions.state,
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
                    {i18n.SELECTED_CASES(selectedCases.length)}
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
              itemId="caseId"
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
    </>
  );
});

AllCases.displayName = 'AllCases';
