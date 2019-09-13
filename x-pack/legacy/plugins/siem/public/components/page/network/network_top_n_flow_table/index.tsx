/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexItem } from '@elastic/eui';
import { isEqual, last } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { networkActions } from '../../../../store/actions';
import {
  Direction,
  FlowTargetNew,
  NetworkTopNFlowEdges,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getNetworkTopNFlowColumns } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkTopNFlowEdges[];
  fakeTotalCount: number;
  flowTargeted: FlowTargetNew;
  id: string;
  indexPattern: StaticIndexPattern;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

interface NetworkTopNFlowTableReduxProps {
  activePage: number;
  limit: number;
  topNFlowSort: NetworkTopNFlowSortField;
}

interface NetworkTopNFlowTableDispatchProps {
  updateTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.NetworkTableType;
  }>;
  updateTopNFlowLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
    tableType: networkModel.TopNTableType;
  }>;
  updateTopNFlowSort: ActionCreator<{
    topNFlowSort: NetworkTopNFlowSortField;
    networkType: networkModel.NetworkType;
    tableType: networkModel.TopNTableType;
  }>;
}

type NetworkTopNFlowTableProps = OwnProps &
  NetworkTopNFlowTableReduxProps &
  NetworkTopNFlowTableDispatchProps;

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

export const NetworkTopNFlowTableId = 'networkTopSourceFlow-top-talkers';

class NetworkTopNFlowTableComponent extends React.PureComponent<NetworkTopNFlowTableProps> {
  public render() {
    const {
      activePage,
      data,
      fakeTotalCount,
      flowTargeted,
      id,
      indexPattern,
      isInspect,
      limit,
      loading,
      loadPage,
      showMorePagesIndicator,
      topNFlowSort,
      totalCount,
      type,
      updateTopNFlowLimit,
      updateTableActivePage,
    } = this.props;

    let tableType: networkModel.TopNTableType;
    let headerTitle: string;

    if (flowTargeted === FlowTargetNew.source) {
      headerTitle = i18n.SOURCE_IP;
      tableType = networkModel.NetworkTableType.topNFlowSource;
    } else {
      headerTitle = i18n.DESTINATION_IP;
      tableType = networkModel.NetworkTableType.topNFlowDestination;
    }

    const field =
      topNFlowSort.field === NetworkTopNFlowFields.bytes_out ||
      topNFlowSort.field === NetworkTopNFlowFields.bytes_in
        ? `node.network.${topNFlowSort.field}`
        : `node.${flowTargeted}.${topNFlowSort.field}`;

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getNetworkTopNFlowColumns(
          indexPattern,
          flowTargeted,
          type,
          NetworkTopNFlowTableId
        )}
        headerCount={totalCount}
        headerTitle={headerTitle}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={criteria => this.onChange(criteria, tableType)}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        sorting={{ field, direction: topNFlowSort.direction }}
        totalCount={fakeTotalCount}
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            tableType,
          })
        }
        updateLimitPagination={newLimit =>
          updateTopNFlowLimit({ limit: newLimit, networkType: type, tableType })
        }
      />
    );
  }

  private onChange = (criteria: Criteria, tableType: networkModel.TopNTableType) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const field = last(splitField);
      const newSortDirection =
        field !== this.props.topNFlowSort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
      const newTopNFlowSort: NetworkTopNFlowSortField = {
        field: field as NetworkTopNFlowFields,
        direction: newSortDirection,
      };
      if (!isEqual(newTopNFlowSort, this.props.topNFlowSort)) {
        this.props.updateTopNFlowSort({
          topNFlowSort: newTopNFlowSort,
          networkType: this.props.type,
          tableType,
        });
      }
    }
  };
}

const mapStateToProps = (state: State, ownProps: OwnProps) =>
  networkSelectors.topNFlowSelector(ownProps.flowTargeted);

export const NetworkTopNFlowTable = connect(
  mapStateToProps,
  {
    updateTopNFlowLimit: networkActions.updateTopNFlowLimit,
    updateTopNFlowSort: networkActions.updateTopNFlowSort,
    updateTableActivePage: networkActions.updateNetworkPageTableActivePage,
  }
)(NetworkTopNFlowTableComponent);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

SelectTypeItem.displayName = 'SelectTypeItem';
