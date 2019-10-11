/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';
import { StaticIndexPattern } from 'ui/index_patterns';

import { networkActions } from '../../../../store/actions';
import {
  Direction,
  DomainsEdges,
  DomainsFields,
  DomainsSortField,
  FlowDirection,
  FlowTarget,
} from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { FlowDirectionSelect } from '../../../flow_controls/flow_direction_select';
import { Criteria, ItemsPerRow, PaginatedTable, SortingBasicTable } from '../../../paginated_table';

import { getDomainsColumns } from './columns';
import * as i18n from './translations';
const tableType = networkModel.IpDetailsTableType.domains;

interface OwnProps {
  data: DomainsEdges[];
  flowTarget: FlowTarget;
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  indexPattern: StaticIndexPattern;
  ip: string;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

interface DomainsTableReduxProps {
  activePage: number;
  domainsSortField: DomainsSortField;
  flowDirection: FlowDirection;
  limit: number;
}

interface DomainsTableDispatchProps {
  updateDomainsDirection: ActionCreator<{
    flowDirection: FlowDirection;
    networkType: networkModel.NetworkType;
  }>;
  updateDomainsLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateDomainsSort: ActionCreator<{
    domainsSort: DomainsSortField;
    networkType: networkModel.NetworkType;
  }>;
  updateTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.IpDetailsTableType;
  }>;
}

type DomainsTableProps = OwnProps & DomainsTableReduxProps & DomainsTableDispatchProps;

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

export const DomainsTableId = 'domains-table';

class DomainsTableComponent extends React.PureComponent<DomainsTableProps> {
  public render() {
    const {
      activePage,
      data,
      domainsSortField,
      fakeTotalCount,
      flowDirection,
      flowTarget,
      id,
      indexPattern,
      ip,
      isInspect,
      limit,
      loading,
      loadPage,
      showMorePagesIndicator,
      totalCount,
      type,
      updateDomainsLimit,
      updateTableActivePage,
    } = this.props;

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getDomainsColumns(
          indexPattern,
          ip,
          flowDirection,
          flowTarget,
          type,
          DomainsTableId
        )}
        dataTestSubj={`table-${tableType}`}
        showMorePagesIndicator={showMorePagesIndicator}
        headerCount={totalCount}
        headerSupplement={
          <FlowDirectionSelect
            selectedDirection={flowDirection}
            onChangeDirection={this.onChangeDomainsDirection}
          />
        }
        headerTitle={i18n.DOMAINS}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={this.onChange}
        pageOfItems={data}
        sorting={getSortField(domainsSortField, flowTarget)}
        totalCount={fakeTotalCount}
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            tableType,
          })
        }
        updateLimitPagination={newLimit =>
          updateDomainsLimit({ limit: newLimit, networkType: type })
        }
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const newDomainsSort: DomainsSortField = {
        field: getSortFromString(splitField[splitField.length - 1]),
        direction: criteria.sort.direction,
      };
      if (!isEqual(newDomainsSort, this.props.domainsSortField)) {
        this.props.updateDomainsSort({
          domainsSortField: newDomainsSort,
          networkType: this.props.type,
        });
      }
    }
  };

  private onChangeDomainsDirection = (flowDirection: FlowDirection) =>
    this.props.updateDomainsDirection({ flowDirection, networkType: this.props.type });
}

const makeMapStateToProps = () => {
  const getDomainsSelector = networkSelectors.domainsSelector();
  const mapStateToProps = (state: State) => ({
    ...getDomainsSelector(state),
  });
  return mapStateToProps;
};

export const DomainsTable = connect(
  makeMapStateToProps,
  {
    updateDomainsLimit: networkActions.updateDomainsLimit,
    updateDomainsDirection: networkActions.updateDomainsFlowDirection,
    updateDomainsSort: networkActions.updateDomainsSort,
    updateTableActivePage: networkActions.updateIpDetailsTableActivePage,
  }
)(DomainsTableComponent);

const getSortField = (sortField: DomainsSortField, flowTarget: FlowTarget): SortingBasicTable => {
  switch (sortField.field) {
    case DomainsFields.domainName:
      return {
        field: `node.${flowTarget}.${sortField.field}`,
        direction: sortField.direction,
      };
    case DomainsFields.bytes:
      return {
        field: `node.network.${sortField.field}`,
        direction: sortField.direction,
      };
    case DomainsFields.packets:
      return {
        field: `node.network.${sortField.field}`,
        direction: sortField.direction,
      };
    case DomainsFields.uniqueIpCount:
      return {
        field: `node.${flowTarget}.${sortField.field}`,
        direction: sortField.direction,
      };
    default:
      return {
        field: 'node.network.bytes',
        direction: Direction.desc,
      };
  }
};

const getSortFromString = (sortField: string): DomainsFields => {
  switch (sortField) {
    case DomainsFields.domainName.valueOf():
      return DomainsFields.domainName;
    case DomainsFields.bytes.valueOf():
      return DomainsFields.bytes;
    case DomainsFields.packets.valueOf():
      return DomainsFields.packets;
    case DomainsFields.uniqueIpCount.valueOf():
      return DomainsFields.uniqueIpCount;
    default:
      return DomainsFields.bytes;
  }
};
