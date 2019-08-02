/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual, last } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { networkActions } from '../../../../store/actions';
import {
  FlowDirection,
  FlowTarget,
  NetworkTopNFlowEdges,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { FlowDirectionSelect } from '../../../flow_controls/flow_direction_select';
import { FlowTargetSelect } from '../../../flow_controls/flow_target_select';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getNetworkTopNFlowColumns } from './columns';
import * as i18n from './translations';

const tableType = networkModel.NetworkTableType.topNFlow;

interface OwnProps {
  data: NetworkTopNFlowEdges[];
  fakeTotalCount: number;
  id: string;
  indexPattern: StaticIndexPattern;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

interface NetworkTopNFlowTableReduxProps {
  limit: number;
  flowDirection: FlowDirection;
  topNFlowSort: NetworkTopNFlowSortField;
  flowTarget: FlowTarget;
}

interface NetworkTopNFlowTableDispatchProps {
  updateTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.NetworkTableType;
  }>;
  updateTopNFlowDirection: ActionCreator<{
    flowDirection: FlowDirection;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowSort: ActionCreator<{
    topNFlowSort: NetworkTopNFlowSortField;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowTarget: ActionCreator<{
    flowTarget: FlowTarget;
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

export const NetworkTopNFlowTableId = 'networkTopNFlow-top-talkers';

class NetworkTopNFlowTableComponent extends React.PureComponent<NetworkTopNFlowTableProps> {
  public render() {
    const {
      data,
      flowDirection,
      flowTarget,
      fakeTotalCount,
      id,
      indexPattern,
      limit,
      loading,
      loadPage,
      showMorePagesIndicator,
      topNFlowSort,
      totalCount,
      type,
      updateTopNFlowLimit,
      updateTopNFlowTarget,
      updateTableActivePage,
    } = this.props;

    const field =
      topNFlowSort.field === NetworkTopNFlowFields.ipCount
        ? `node.${flowTarget}.count`
        : `node.network.${topNFlowSort.field}`;

    return (
      <PaginatedTable
        columns={getNetworkTopNFlowColumns(
          indexPattern,
          flowDirection,
          flowTarget,
          type,
          NetworkTopNFlowTableId
        )}
        headerCount={totalCount}
        headerSupplement={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <SelectTypeItem
                grow={false}
                data-test-subj={`${NetworkTopNFlowTableId}-select-flow-target`}
              >
                <FlowTargetSelect
                  id={NetworkTopNFlowTableId}
                  isLoading={loading}
                  selectedDirection={flowDirection}
                  selectedTarget={flowTarget}
                  displayTextOverride={[
                    i18n.BY_SOURCE_IP,
                    i18n.BY_DESTINATION_IP,
                    i18n.BY_CLIENT_IP,
                    i18n.BY_SERVER_IP,
                  ]}
                  updateFlowTargetAction={updateTopNFlowTarget}
                />
              </SelectTypeItem>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <FlowDirectionSelect
                selectedDirection={flowDirection}
                onChangeDirection={this.onChangeTopNFlowDirection}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        headerTitle={i18n.TOP_TALKERS}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={this.onChange}
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
          updateTopNFlowLimit({ limit: newLimit, networkType: type })
        }
        updateProps={{ flowDirection, flowTarget, totalCount, topNFlowSort, field }}
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const field = last(splitField) === 'count' ? NetworkTopNFlowFields.ipCount : last(splitField);
      const newTopNFlowSort: NetworkTopNFlowSortField = {
        field: field as NetworkTopNFlowFields,
        direction: criteria.sort.direction,
      };
      if (!isEqual(newTopNFlowSort, this.props.topNFlowSort)) {
        this.props.updateTopNFlowSort({
          topNFlowSort: newTopNFlowSort,
          networkType: this.props.type,
        });
      }
    }
  };

  private onChangeTopNFlowDirection = (flowDirection: FlowDirection) =>
    this.props.updateTopNFlowDirection({ flowDirection, networkType: this.props.type });
}

const makeMapStateToProps = () => {
  const getNetworkTopNFlowSelector = networkSelectors.topNFlowSelector();
  const mapStateToProps = (state: State) => getNetworkTopNFlowSelector(state);
  return mapStateToProps;
};

export const NetworkTopNFlowTable = connect(
  makeMapStateToProps,
  {
    updateTopNFlowLimit: networkActions.updateTopNFlowLimit,
    updateTopNFlowSort: networkActions.updateTopNFlowSort,
    updateTopNFlowTarget: networkActions.updateTopNFlowTarget,
    updateTopNFlowDirection: networkActions.updateTopNFlowDirection,
    updateTableActivePage: networkActions.updateNetworkPageTableActivePage,
  }
)(NetworkTopNFlowTableComponent);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;
