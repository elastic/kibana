/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';

import { networkActions } from '../../../../store/network';
import { TlsEdges, TlsSortField, TlsFields } from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable, SortingBasicTable } from '../../../paginated_table';
import { getTlsColumns } from './columns';
import * as i18n from './translations';
const tableType = networkModel.IpDetailsTableType.tls;

interface OwnProps {
  data: TlsEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

interface TlsTableReduxProps {
  activePage: number;
  limit: number;
  tlsSortField: TlsSortField;
}

interface TlsTableDispatchProps {
  updateTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.IpDetailsTableType;
  }>;
  updateTlsLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateTlsSort: ActionCreator<{
    tlsSort: TlsSortField;
    networkType: networkModel.NetworkType;
  }>;
}

type TlsTableProps = OwnProps & TlsTableReduxProps & TlsTableDispatchProps;

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

export const tlsTableId = 'tls-table';

class TlsTableComponent extends React.PureComponent<TlsTableProps> {
  public render() {
    const {
      activePage,
      data,
      fakeTotalCount,
      id,
      isInspect,
      limit,
      loading,
      loadPage,
      showMorePagesIndicator,
      tlsSortField,
      totalCount,
      type,
      updateTableActivePage,
      updateTlsLimit,
    } = this.props;
    return (
      <PaginatedTable
        activePage={activePage}
        columns={getTlsColumns(tlsTableId)}
        dataTestSubj={`table-${tableType}`}
        showMorePagesIndicator={showMorePagesIndicator}
        headerCount={totalCount}
        headerTitle={i18n.TRANSPORT_LAYER_SECURITY}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={this.onChange}
        pageOfItems={data}
        sorting={getSortField(tlsSortField)}
        totalCount={fakeTotalCount}
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            tableType,
          })
        }
        updateLimitPagination={newLimit => updateTlsLimit({ limit: newLimit, networkType: type })}
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const newTlsSort: TlsSortField = {
        field: getSortFromString(splitField[splitField.length - 1]),
        direction: criteria.sort.direction,
      };
      if (!isEqual(newTlsSort, this.props.tlsSortField)) {
        this.props.updateTlsSort({
          tlsSortField: newTlsSort,
          networkType: this.props.type,
        });
      }
    }
  };
}

const makeMapStateToProps = () => {
  const getTlsSelector = networkSelectors.tlsSelector();
  return (state: State) => ({
    ...getTlsSelector(state),
  });
};

export const TlsTable = connect(
  makeMapStateToProps,
  {
    updateTableActivePage: networkActions.updateIpDetailsTableActivePage,
    updateTlsLimit: networkActions.updateTlsLimit,
    updateTlsSort: networkActions.updateTlsSort,
  }
)(TlsTableComponent);

const getSortField = (sortField: TlsSortField): SortingBasicTable => ({
  field: `node.${sortField.field}`,
  direction: sortField.direction,
});

const getSortFromString = (sortField: string): TlsFields => {
  switch (sortField) {
    case '_id':
      return TlsFields._id;
    default:
      return TlsFields._id;
  }
};
