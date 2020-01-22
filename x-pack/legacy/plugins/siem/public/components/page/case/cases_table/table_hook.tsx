/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionCreator } from 'typescript-fsa';
import * as i18n from './translations';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getCasesColumns } from './columns';
import { Direction, SortFieldCase } from '../../../../graphql/types';
import { caseActions, caseModel } from '../../../../store/case';
import { useCaseApi } from '../../../../hooks/case/use_case_api';

interface CasesTableProps {
  id: string;
}

interface CasesTableDispatchProps {
  updateCaseTable: ActionCreator<{
    tableType: caseModel.CaseTableType;
    updates: caseModel.TableUpdates;
  }>;
}

type CasesPaginatedTableProps = CasesTableProps & CasesTableDispatchProps;
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
export const CasesPaginatedTableComponent = React.memo(
  ({ id, updateCaseTable }: CasesPaginatedTableProps) => {
    const [
      {
        data,
        isLoading,
        isError,
        table: { page, perPage, sortOrder, sortField },
      },
      doFetch,
    ] = useCaseApi();

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
            newSort = SortFieldCase.created_at;
            break;
          case 'updated_at':
            newSort = SortFieldCase.updated_at;
            break;
          default:
            newSort = SortFieldCase.created_at;
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
        id={id}
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
  }
);

CasesPaginatedTableComponent.displayName = 'CasesPaginatedTableComponent';

export const CasesPaginatedTable = compose<React.ComponentClass<CasesTableProps>>(
  connect(null, {
    updateCaseTable: caseActions.updateCaseTable,
  })
)(CasesPaginatedTableComponent);
