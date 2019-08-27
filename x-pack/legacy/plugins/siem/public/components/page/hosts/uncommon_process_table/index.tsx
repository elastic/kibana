/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { hostsActions } from '../../../../store/actions';
import { UncommonProcessesEdges, UncommonProcessItem } from '../../../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import { defaultToEmptyTag, getEmptyValue } from '../../../empty_value';
import { HostDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import * as i18n from './translations';
import { getRowItemDraggables } from '../../../tables/helpers';
const tableType = hostsModel.HostsTableType.uncommonProcesses;
interface OwnProps {
  data: UncommonProcessesEdges[];
  fakeTotalCount: number;
  id: string;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

interface UncommonProcessTableReduxProps {
  limit: number;
}

interface UncommonProcessTableDispatchProps {
  updateTableActivePage: ActionCreator<{
    activePage: number;
    hostsType: hostsModel.HostsType;
    tableType: hostsModel.HostsTableType;
  }>;
  updateTableLimit: ActionCreator<{
    limit: number;
    hostsType: hostsModel.HostsType;
    tableType: hostsModel.HostsTableType;
  }>;
}

export type UncommonProcessTableColumns = [
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>
];

type UncommonProcessTableProps = OwnProps &
  UncommonProcessTableReduxProps &
  UncommonProcessTableDispatchProps;

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

export const getArgs = (args: string[] | null | undefined): string | null => {
  if (args != null && args.length !== 0) {
    return args.join(' ');
  } else {
    return null;
  }
};

const UncommonProcessTableComponent = pure<UncommonProcessTableProps>(
  ({
    data,
    fakeTotalCount,
    id,
    limit,
    loading,
    loadPage,
    totalCount,
    showMorePagesIndicator,
    updateTableActivePage,
    updateTableLimit,
    type,
  }) => (
    <PaginatedTable
      columns={getUncommonColumns()}
      headerCount={totalCount}
      headerTitle={i18n.UNCOMMON_PROCESSES}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={newActivePage => loadPage(newActivePage)}
      pageOfItems={data}
      showMorePagesIndicator={showMorePagesIndicator}
      totalCount={fakeTotalCount}
      updateLimitPagination={newLimit =>
        updateTableLimit({
          hostsType: type,
          limit: newLimit,
          tableType,
        })
      }
      updateActivePage={newPage =>
        updateTableActivePage({
          activePage: newPage,
          hostsType: type,
          tableType,
        })
      }
      updateProps={{ totalCount }}
    />
  )
);

UncommonProcessTableComponent.displayName = 'UncommonProcessTableComponent';

const makeMapStateToProps = () => {
  const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
  return (state: State, { type }: OwnProps) => getUncommonProcessesSelector(state, type);
};

export const UncommonProcessTable = connect(
  makeMapStateToProps,
  {
    updateTableActivePage: hostsActions.updateTableActivePage,
    updateTableLimit: hostsActions.updateTableLimit,
  }
)(UncommonProcessTableComponent);

const getUncommonColumns = (): UncommonProcessTableColumns => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.process.name,
        attrName: 'process.name',
        idPrefix: `uncommon-process-table-${node._id}-processName`,
      }),
  },
  {
    name: i18n.NUMBER_OF_HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => <>{node.hosts != null ? node.hosts.length : getEmptyValue()}</>,
  },
  {
    name: i18n.NUMBER_OF_INSTANCES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.instances),
  },
  {
    name: i18n.HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getHostNames(node),
        attrName: 'host.name',
        idPrefix: `uncommon-process-table-${node._id}-processHost`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
  },
  {
    name: i18n.LAST_COMMAND,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.process != null ? node.process.args : null,
        attrName: 'process.args',
        idPrefix: `uncommon-process-table-${node._id}-processArgs`,
        displayCount: 1, // TODO: Change this back once we have improved the UI
      }),
  },
  {
    name: i18n.LAST_USER,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.user != null ? node.user.name : null,
        attrName: 'user.name',
        idPrefix: `uncommon-process-table-${node._id}-processUser`,
      }),
  },
];

export const getHostNames = (node: UncommonProcessItem): string[] => {
  if (node.hosts != null) {
    return node.hosts
      .filter(host => host.name != null && host.name[0] != null)
      .map(host => (host.name != null && host.name[0] != null ? host.name[0] : ''));
  } else {
    return [];
  }
};
