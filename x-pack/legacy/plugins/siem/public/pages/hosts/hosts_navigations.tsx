/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { getOr } from 'lodash/fp';
import React from 'react';
import * as i18n from './translations';

import { NavTab } from '../../components/navigation/type';
import { HostsTable, UncommonProcessTable } from '../../components/page/hosts';

import { HostsQuery } from '../../containers/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { AnomaliesHostTable } from '../../components/ml/tables/anomalies_host_table';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { InspectQuery, Refetch } from '../../store/inputs/model';
import { NarrowDateRange } from '../../components/ml/types';
import { hostsModel } from '../../store';
import { manageQuery } from '../../components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { ESTermQuery } from '../../../common/typed_json';
import { HostsTableType } from '../../store/hosts/model';
import { StatefulEventsViewer } from '../../components/events_viewer';

const getTabsOnHostsUrl = (tabName: HostsTableType) => `#/hosts/${tabName}`;
const getTabsOnHostDetailsUrl = (hostName: string, tabName: HostsTableType) => {
  return `#/hosts/${hostName}/${tabName}`;
};

export type KeyHostsNavTab =
  | HostsTableType.hosts
  | HostsTableType.authentications
  | HostsTableType.uncommonProcesses
  | HostsTableType.anomalies
  | HostsTableType.events;

export type KeyHostDetailsNavTab =
  | HostsTableType.authentications
  | HostsTableType.uncommonProcesses
  | HostsTableType.anomalies
  | HostsTableType.events;

export type HostsNavTab = Record<KeyHostsNavTab, NavTab>;

export const navTabsHosts: HostsNavTab = {
  [HostsTableType.hosts]: {
    id: HostsTableType.hosts,
    name: i18n.NAVIGATION_ALL_HOSTS_TITLE,
    href: getTabsOnHostsUrl(HostsTableType.hosts),
    disabled: false,
    urlKey: 'host',
  },
  [HostsTableType.authentications]: {
    id: HostsTableType.authentications,
    name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
    href: getTabsOnHostsUrl(HostsTableType.authentications),
    disabled: false,
    urlKey: 'host',
  },
  [HostsTableType.uncommonProcesses]: {
    id: HostsTableType.uncommonProcesses,
    name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
    href: getTabsOnHostsUrl(HostsTableType.uncommonProcesses),
    disabled: false,
    urlKey: 'host',
  },
  [HostsTableType.anomalies]: {
    id: HostsTableType.anomalies,
    name: i18n.NAVIGATION_ANOMALIES_TITLE,
    href: getTabsOnHostsUrl(HostsTableType.anomalies),
    disabled: false,
    urlKey: 'host',
  },
  [HostsTableType.events]: {
    id: HostsTableType.events,
    name: i18n.NAVIGATION_EVENTS_TITLE,
    href: getTabsOnHostsUrl(HostsTableType.events),
    disabled: false,
    urlKey: 'host',
  },
};

export const navTabsHostDetails = (hostName: string): Record<KeyHostDetailsNavTab, NavTab> => ({
  [HostsTableType.authentications]: {
    id: HostsTableType.authentications,
    name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTableType.authentications),
    disabled: false,
    urlKey: 'host',
    isDetailPage: true,
  },
  [HostsTableType.uncommonProcesses]: {
    id: HostsTableType.uncommonProcesses,
    name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTableType.uncommonProcesses),
    disabled: false,
    urlKey: 'host',
    isDetailPage: true,
  },
  [HostsTableType.anomalies]: {
    id: HostsTableType.anomalies,
    name: i18n.NAVIGATION_ANOMALIES_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTableType.anomalies),
    disabled: false,
    urlKey: 'host',
    isDetailPage: true,
  },
  [HostsTableType.events]: {
    id: HostsTableType.events,
    name: i18n.NAVIGATION_EVENTS_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTableType.events),
    disabled: false,
    urlKey: 'host',
    isDetailPage: true,
  },
});

interface OwnProps {
  type: hostsModel.HostsType;
  startDate: number;
  endDate: number;
  filterQuery?: string | ESTermQuery;
  kqlQueryExpression: string;
}
export type HostsComponentsQueryProps = OwnProps & {
  indexPattern: StaticIndexPattern;
  skip: boolean;
  setQuery: ({
    id,
    inspect,
    loading,
    refetch,
  }: {
    id: string;
    inspect: InspectQuery | null;
    loading: boolean;
    refetch: Refetch;
  }) => void;
  narrowDateRange?: NarrowDateRange;
};

export type AnomaliesQueryTabBodyProps = OwnProps & {
  skip: boolean;
  narrowDateRange: NarrowDateRange;
  hostName?: string;
};

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);

export const HostsQueryTabBody = ({
  endDate,
  filterQuery,
  indexPattern,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  return (
    <HostsQuery
      endDate={endDate}
      filterQuery={filterQuery}
      skip={skip}
      sourceId="default"
      startDate={startDate}
      type={type}
    >
      {({ hosts, totalCount, loading, pageInfo, loadPage, id, inspect, refetch }) => (
        <HostsTableManage
          data={hosts}
          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
          id={id}
          indexPattern={indexPattern}
          inspect={inspect}
          loading={loading}
          loadPage={loadPage}
          refetch={refetch}
          setQuery={setQuery}
          showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
          totalCount={totalCount}
          type={hostsModel.HostsType.page}
        />
      )}
    </HostsQuery>
  );
};

export const AuthenticationsQueryTabBody = ({
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  return (
    <AuthenticationsQuery
      endDate={endDate}
      filterQuery={filterQuery}
      skip={skip}
      sourceId="default"
      startDate={startDate}
      type={type}
    >
      {({ authentications, totalCount, loading, pageInfo, loadPage, id, inspect, refetch }) => (
        <AuthenticationTableManage
          data={authentications}
          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
          id={id}
          inspect={inspect}
          loading={loading}
          loadPage={loadPage}
          refetch={refetch}
          showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
          setQuery={setQuery}
          totalCount={totalCount}
          type={hostsModel.HostsType.page}
        />
      )}
    </AuthenticationsQuery>
  );
};

export const UncommonProcessTabBody = ({
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  return (
    <UncommonProcessesQuery
      endDate={endDate}
      filterQuery={filterQuery}
      skip={skip}
      sourceId="default"
      startDate={startDate}
      type={type}
    >
      {({ uncommonProcesses, totalCount, loading, pageInfo, loadPage, id, inspect, refetch }) => (
        <UncommonProcessTableManage
          data={uncommonProcesses}
          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
          id={id}
          inspect={inspect}
          loading={loading}
          loadPage={loadPage}
          refetch={refetch}
          setQuery={setQuery}
          showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
          totalCount={totalCount}
          type={hostsModel.HostsType.page}
        />
      )}
    </UncommonProcessesQuery>
  );
};

export const AnomaliesTabBody = ({
  endDate,
  skip,
  startDate,
  type,
  narrowDateRange,
  hostName,
}: AnomaliesQueryTabBodyProps) => {
  return (
    <AnomaliesHostTable
      startDate={startDate}
      endDate={endDate}
      skip={skip}
      type={type}
      hostName={hostName}
      narrowDateRange={narrowDateRange}
    />
  );
};

export const EventsTabBody = ({
  endDate,
  kqlQueryExpression,
  startDate,
}: HostsComponentsQueryProps) => {
  const HOSTS_PAGE_TIMELINE_ID = 'hosts-page';

  return (
    <StatefulEventsViewer
      end={endDate}
      id={HOSTS_PAGE_TIMELINE_ID}
      kqlQueryExpression={kqlQueryExpression}
      start={startDate}
    />
  );
};
