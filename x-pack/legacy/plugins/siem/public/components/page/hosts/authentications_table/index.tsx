/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { hostsActions } from '../../../../store/hosts';
import { AuthenticationsEdges } from '../../../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { FormattedRelativePreferenceDate } from '../../../formatted_date';
import { HostDetailsLink, IPDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, PaginatedTable } from '../../../paginated_table';
import { IS_OPERATOR } from '../../../timeline/data_providers/data_provider';
import { Provider } from '../../../timeline/data_providers/provider';

import * as i18n from './translations';
import { getRowItemDraggables } from '../../../tables/helpers';

const tableType = hostsModel.HostsTableType.authentications;

interface OwnProps {
  data: AuthenticationsEdges[];
  fakeTotalCount: number;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  id: string;
  isInspect: boolean;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type AuthTableColumns = [
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>,
  Columns<AuthenticationsEdges>
];

type AuthenticationTableProps = OwnProps & PropsFromRedux;

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

const AuthenticationTableComponent = React.memo<AuthenticationTableProps>(
  ({
    activePage,
    data,
    fakeTotalCount,
    id,
    isInspect,
    limit,
    loading,
    loadPage,
    showMorePagesIndicator,
    totalCount,
    type,
    updateTableActivePage,
    updateTableLimit,
  }) => {
    const updateLimitPagination = useCallback(
      newLimit =>
        updateTableLimit({
          hostsType: type,
          limit: newLimit,
          tableType,
        }),
      [type, updateTableLimit]
    );

    const updateActivePage = useCallback(
      newPage =>
        updateTableActivePage({
          activePage: newPage,
          hostsType: type,
          tableType,
        }),
      [type, updateTableActivePage]
    );

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getAuthenticationColumnsCurated(type)}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={i18n.AUTHENTICATIONS}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={loadPage}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        totalCount={fakeTotalCount}
        updateLimitPagination={updateLimitPagination}
        updateActivePage={updateActivePage}
      />
    );
  }
);

AuthenticationTableComponent.displayName = 'AuthenticationTableComponent';

const makeMapStateToProps = () => {
  const getAuthenticationsSelector = hostsSelectors.authenticationsSelector();
  return (state: State, { type }: OwnProps) => {
    return getAuthenticationsSelector(state, type);
  };
};

const connector = connect(makeMapStateToProps, {
  updateTableActivePage: hostsActions.updateTableActivePage,
  updateTableLimit: hostsActions.updateTableLimit,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AuthenticationTable = connector(AuthenticationTableComponent);

const getAuthenticationColumns = (): AuthTableColumns => [
  {
    name: i18n.USER,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.user.name,
        attrName: 'user.name',
        idPrefix: `authentications-table-${node._id}-userName`,
      }),
  },
  {
    name: i18n.SUCCESSES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const id = escapeDataProviderId(
        `authentications-table-${node._id}-node-successes-${node.successes}`
      );
      return (
        <DraggableWrapper
          key={id}
          dataProvider={{
            and: [],
            enabled: true,
            id,
            name: 'authentication_success',
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              field: 'event.type',
              value: 'authentication_success',
              operator: IS_OPERATOR,
            },
          }}
          render={(dataProvider, _, snapshot) =>
            snapshot.isDragging ? (
              <DragEffects>
                <Provider dataProvider={dataProvider} />
              </DragEffects>
            ) : (
              node.successes
            )
          }
        />
      );
    },
    width: '8%',
  },
  {
    name: i18n.FAILURES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const id = escapeDataProviderId(
        `authentications-table-${node._id}-failures-${node.failures}`
      );
      return (
        <DraggableWrapper
          key={id}
          dataProvider={{
            and: [],
            enabled: true,
            id,
            name: 'authentication_failure',
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              field: 'event.type',
              value: 'authentication_failure',
              operator: IS_OPERATOR,
            },
          }}
          render={(dataProvider, _, snapshot) =>
            snapshot.isDragging ? (
              <DragEffects>
                <Provider dataProvider={dataProvider} />
              </DragEffects>
            ) : (
              node.failures
            )
          }
        />
      );
    },
    width: '8%',
  },
  {
    name: i18n.LAST_SUCCESSFUL_TIME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      has('lastSuccess.timestamp', node) && node.lastSuccess!.timestamp != null ? (
        <FormattedRelativePreferenceDate value={node.lastSuccess!.timestamp} />
      ) : (
        getEmptyTagValue()
      ),
  },
  {
    name: i18n.LAST_SUCCESSFUL_SOURCE,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems:
          node.lastSuccess != null &&
          node.lastSuccess.source != null &&
          node.lastSuccess.source.ip != null
            ? node.lastSuccess.source.ip
            : null,
        attrName: 'source.ip',
        idPrefix: `authentications-table-${node._id}-lastSuccessSource`,
        render: item => <IPDetailsLink ip={item} />,
      }),
  },
  {
    name: i18n.LAST_SUCCESSFUL_DESTINATION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems:
          node.lastSuccess != null &&
          node.lastSuccess.host != null &&
          node.lastSuccess.host.name != null
            ? node.lastSuccess.host.name
            : null,
        attrName: 'host.name',
        idPrefix: `authentications-table-${node._id}-lastSuccessfulDestination`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
  },
  {
    name: i18n.LAST_FAILED_TIME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      has('lastFailure.timestamp', node) && node.lastFailure!.timestamp != null ? (
        <FormattedRelativePreferenceDate value={node.lastFailure!.timestamp} />
      ) : (
        getEmptyTagValue()
      ),
  },
  {
    name: i18n.LAST_FAILED_SOURCE,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems:
          node.lastFailure != null &&
          node.lastFailure.source != null &&
          node.lastFailure.source.ip != null
            ? node.lastFailure.source.ip
            : null,
        attrName: 'source.ip',
        idPrefix: `authentications-table-${node._id}-lastFailureSource`,
        render: item => <IPDetailsLink ip={item} />,
      }),
  },
  {
    name: i18n.LAST_FAILED_DESTINATION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems:
          node.lastFailure != null &&
          node.lastFailure.host != null &&
          node.lastFailure.host.name != null
            ? node.lastFailure.host.name
            : null,
        attrName: 'host.name',
        idPrefix: `authentications-table-${node._id}-lastFailureDestination`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
  },
];

export const getAuthenticationColumnsCurated = (
  pageType: hostsModel.HostsType
): AuthTableColumns => {
  const columns = getAuthenticationColumns();

  // Columns to exclude from host details pages
  if (pageType === hostsModel.HostsType.details) {
    return [i18n.LAST_FAILED_DESTINATION, i18n.LAST_SUCCESSFUL_DESTINATION].reduce((acc, name) => {
      acc.splice(
        acc.findIndex(column => column.name === name),
        1
      );
      return acc;
    }, columns);
  }

  return columns;
};
