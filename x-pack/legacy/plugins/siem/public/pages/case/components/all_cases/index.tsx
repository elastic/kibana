/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
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
import { Direction, SortFieldCase, CaseSavedObject } from '../../../../containers/case/types';
import { useGetCases } from '../../../../containers/case/use_get_cases';
import { EuiBasicTableOnChange } from '../../../detection_engine/rules/types';
import { Panel } from '../../../../components/panel';
import { HeaderSection } from '../../../../components/header_section';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';

export const AllCases = React.memo(() => {
  const [{ data, isLoading, isError, pagination }, doFetch] = useGetCases();

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      let newPagination = {};
      if (sort) {
        let newSort;
        switch (sort.field) {
          case 'attributes.state':
            newSort = SortFieldCase.state;
            break;
          case 'attributes.created_at':
            newSort = 'attributes.created_at';
            break;
          case 'updated_at':
            newSort = SortFieldCase.updatedAt;
            break;
          default:
            newSort = SortFieldCase.createdAt;
        }
        const oppositeSort = sort.direction === Direction.asc ? Direction.desc : Direction.asc;
        const newOrder =
          sort.direction === pagination.sortOrder && pagination.sortField === newSort
            ? oppositeSort
            : sort.direction;
        newPagination = {
          ...newPagination,
          sortField: newSort,
          sortOrder: newOrder as Direction,
        };
      }
      if (page) {
        newPagination = {
          ...newPagination,
          page: page.index + 1,
          perPage: page.size,
        };
      }
      doFetch(newPagination);
    },
    [doFetch, pagination]
  );

  const sorting = {
    sort: { field: pagination.sortField, direction: pagination.sortOrder },
  } as EuiTableSortingType<CaseSavedObject>;
  return isError ? null : (
    <Panel loading={isLoading}>
      <HeaderSection split title={i18n.ALL_CASES}>
        <p>{`TableFilters placeholder`}</p>
      </HeaderSection>
      {isLoading && isEmpty(data.saved_objects) && (
        <EuiLoadingContent data-test-subj="initialLoadingPanelAllCases" lines={10} />
      )}
      {!isLoading && !isEmpty(data.saved_objects) && (
        <>
          <UtilityBar border>
            <UtilityBarSection>
              <UtilityBarGroup>
                <UtilityBarText>{i18n.SHOWING_CASES(data.total ?? 0)}</UtilityBarText>
              </UtilityBarGroup>
            </UtilityBarSection>
          </UtilityBar>
          <EuiBasicTable
            columns={getCasesColumns()}
            itemId="id"
            items={data.saved_objects}
            noItemsMessage={
              <EuiEmptyPrompt
                title={<h3>{i18n.NO_CASES}</h3>}
                titleSize="xs"
                body={i18n.NO_CASES_BODY}
                actions={
                  <EuiButton fill size="s" href={`#`} iconType="plusInCircle">
                    {i18n.ADD_NEW_CASE}
                  </EuiButton>
                }
              />
            }
            onChange={tableOnChangeCallback}
            pagination={{
              pageIndex: pagination.page - 1,
              pageSize: pagination.perPage,
              totalItemCount: data.total,
              pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
            }}
            sorting={sorting}
          />
        </>
      )}
    </Panel>
  );
});

AllCases.displayName = 'AllCases';
