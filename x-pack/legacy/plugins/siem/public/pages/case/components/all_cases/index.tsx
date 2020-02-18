/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiTableSortingType,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import * as i18n from './translations';

import { getCasesColumns } from './columns';
import { SortFieldCase, Case, FilterOptions } from '../../../../containers/case/types';

import { Direction } from '../../../../graphql/types';
import { useGetCases } from '../../../../containers/case/use_get_cases';
import { EuiBasicTableOnChange } from '../../../detection_engine/rules/types';
import { Panel } from '../../../../components/panel';
import { HeaderSection } from '../../../../components/header_section';
import { CasesTableFilters } from './table_filters';

import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';
import { getCreateCaseUrl } from '../../../../components/link_to';

export const AllCases = React.memo(() => {
  const [
    { data, isLoading, queryParams, filterOptions },
    setQueryParams,
    setFilters,
  ] = useGetCases();

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      let newQueryParams = queryParams;
      if (sort) {
        let newSort;
        switch (sort.field) {
          case 'state':
            newSort = SortFieldCase.state;
            break;
          case 'created_at':
            newSort = SortFieldCase.createdAt;
            break;
          case 'updated_at':
            newSort = SortFieldCase.updatedAt;
            break;
          default:
            newSort = SortFieldCase.createdAt;
        }
        newQueryParams = {
          ...newQueryParams,
          sortField: newSort,
          sortOrder: sort.direction as Direction,
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

  const memoizedGetCasesColumns = useMemo(() => getCasesColumns(), []);
  const memoizedPagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      totalItemCount: data.total,
      pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
    }),
    [data, queryParams]
  );

  const sorting: EuiTableSortingType<Case> = {
    sort: { field: queryParams.sortField, direction: queryParams.sortOrder },
  };

  return (
    <Panel loading={isLoading}>
      <HeaderSection split title={i18n.ALL_CASES}>
        <CasesTableFilters
          onFilterChanged={onFilterChangedCallback}
          initial={{ search: filterOptions.search, tags: filterOptions.tags }}
        />
      </HeaderSection>
      {isLoading && isEmpty(data.cases) && (
        <EuiLoadingContent data-test-subj="initialLoadingPanelAllCases" lines={10} />
      )}
      {!isLoading && !isEmpty(data.cases) && (
        <>
          <UtilityBar border>
            <UtilityBarSection>
              <UtilityBarGroup>
                <UtilityBarText>{i18n.SHOWING_CASES(data.total ?? 0)}</UtilityBarText>
              </UtilityBarGroup>
            </UtilityBarSection>
          </UtilityBar>
          <EuiBasicTable
            columns={memoizedGetCasesColumns}
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
            sorting={sorting}
          />
        </>
      )}
    </Panel>
  );
});

AllCases.displayName = 'AllCases';
