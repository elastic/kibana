/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import * as i18n from './translations';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getCasesColumns } from './columns';
import { Direction, SortFieldCase } from '../../../../hooks/case/types';
import { useGetCases } from '../../../../hooks/case/use_get_cases';

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];
export const CasesPaginatedTable = React.memo(() => {
  const [
    {
      data,
      isLoading,
      isError,
      table: { page, perPage, sortOrder, sortField },
    },
    doFetch,
  ] = useGetCases();

  const updateActivePage = (newPage: number) =>
    doFetch({
      page: newPage + 1,
    });

  const updateLimitPagination = (newLimit: number) =>
    doFetch({
      page: 1, // reset to first page
      perPage: newLimit,
    });

  const onChange = (criteria: Criteria) => {
    if (criteria.sort != null && criteria.sort.direction !== sortOrder) {
      let newSort;
      switch (criteria.sort.field) {
        case 'attributes.state':
          newSort = SortFieldCase.state;
          break;
        case 'attributes.created_at':
          newSort = SortFieldCase.createdAt;
          break;
        case 'updated_at':
          newSort = SortFieldCase.updatedAt;
          break;
        default:
          newSort = SortFieldCase.createdAt;
      }
      doFetch({
        sortField: newSort,
        sortOrder: criteria.sort.direction as Direction,
      });
    }
  };

  const sorting = { field: `attributes.${sortField}`, direction: sortOrder };
  return isError ? null : (
    <PaginatedTable
      activePage={page - 1}
      columns={getCasesColumns()}
      headerCount={data.total}
      headerTitle={
        <FormattedMessage id="xpack.siem.casesTable.header" defaultMessage={i18n.ALL_CASES} />
      }
      headerUnit={i18n.UNIT(data.total)}
      hideInspect={true}
      id={'getCasesTable'}
      itemsPerRow={rowItems}
      limit={perPage}
      limitResetsActivePage={false}
      loading={isLoading}
      loadPage={newPage => newPage}
      onChange={onChange}
      pageOfItems={data.saved_objects}
      showMorePagesIndicator={false}
      sorting={sorting}
      totalCount={data.total}
      updateActivePage={updateActivePage}
      updateLimitPagination={updateLimitPagination}
    />
  );
});

CasesPaginatedTable.displayName = 'CasesPaginatedTable';
