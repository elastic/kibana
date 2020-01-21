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
import { Criteria, PaginatedTable } from '../../../paginated_table';

import { getCasesColumns } from './columns';
import { CasesSavedObjects, Direction, SortCase, SortFieldCase } from '../../../../graphql/types';
import { caseActions, caseSelectors, caseModel } from '../../../../store/case';
import { State } from '../../../../store';

interface CasesTableProps {
  id: string;
  cases: CasesSavedObjects;
  loading: boolean;
}

interface CasesTableReduxProps {
  activePage: number;
  limit: number;
  sort: SortCase;
}

interface CasesTableDispatchProps {
  updateCaseTable: ActionCreator<{
    tableType: caseModel.CaseTableType;
    updates: caseModel.TableUpdates;
  }>;
}

type CasesPaginatedTableProps = CasesTableReduxProps & CasesTableProps & CasesTableDispatchProps;

export const CasesPaginatedTableComponent = React.memo(
  ({ id, cases, loading, sort, activePage, limit, updateCaseTable }: CasesPaginatedTableProps) => {
    const tableType = caseModel.CaseTableType.cases;
    const updateActivePage = useCallback(
      newPage =>
        updateCaseTable({
          tableType,
          updates: { activePage: newPage },
        }),
      [updateCaseTable, tableType]
    );

    const updateLimitPagination = useCallback(
      newLimit =>
        updateCaseTable({
          tableType,
          updates: { limit: newLimit },
        }),
      [updateCaseTable, tableType]
    );

    const onChange = useCallback(
      (criteria: Criteria) => {
        console.log('Critera sort', criteria.sort);
        console.log('sortsortsort', sort);
        if (criteria.sort != null && criteria.sort.direction !== sort.direction) {
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
          console.log('newSort', newSort)
          updateCaseTable({
            tableType,
            updates: {
              sort: {
                field: newSort,
                direction: criteria.sort.direction as Direction,
              },
            },
          });
        }
      },
      [tableType, sort.direction, updateCaseTable]
    );

    const sorting = { field: `attributes.${sort.field}`, direction: sort.direction };

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getCasesColumns()}
        headerCount={cases.total}
        headerTitle={
          <FormattedMessage id="xpack.siem.casesTable.header" defaultMessage="Case Management" />
        }
        headerUnit={'cases'}
        hideInspect={true}
        id={id}
        limit={limit}
        loading={loading}
        loadPage={page => updateActivePage(page)}
        onChange={onChange}
        pageOfItems={cases.saved_objects}
        showMorePagesIndicator={false}
        sorting={sorting}
        totalCount={cases.total}
        updateActivePage={updateActivePage}
        updateLimitPagination={updateLimitPagination}
      />
    );
  }
);

CasesPaginatedTableComponent.displayName = 'CasesPaginatedTableComponent';
const makeMapStateToProps = () => {
  const getCasesSelector = caseSelectors.casesSelector();
  return (state: State) => getCasesSelector(state);
};
export const CasesPaginatedTable = compose<React.ComponentClass<CasesTableProps>>(
  connect(makeMapStateToProps, {
    updateCaseTable: caseActions.updateCaseTable,
  })
)(CasesPaginatedTableComponent);
