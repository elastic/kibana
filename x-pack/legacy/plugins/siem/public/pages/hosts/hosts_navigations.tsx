/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { getOr } from 'lodash/fp';
import React from 'react';
import * as i18n from './translations';

import { NavTab } from '../../components/navigation/tab_navigation';
import { EventsTable, HostsTable, UncommonProcessTable } from '../../components/page/hosts';

import { HostsQuery } from '../../containers/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { EventsQuery } from '../../containers/events';
import { AnomaliesHostTable } from '../../components/ml/tables/anomalies_host_table';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { InspectQuery, Refetch } from '../../store/inputs/model';
import { NarrowDateRange } from '../../components/ml/types';
import { hostsModel } from '../../store';
import { manageQuery } from '../../components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { ESTermQuery } from '../../../common/typed_json';

const getTabsOnHostsUrl = (tabName: HostsTabName) => `#/hosts/${tabName}`;
const getTabsOnHostDetailsUrl = (hostName: string, tabName: HostsTabName) => {
  return `#/hosts/${hostName}/${tabName}`;
};

export enum HostsTabName {
  hosts = 'hosts',
  authentications = 'authentications',
  uncommonProcesses = 'uncommon_processes',
  anomalies = 'anomalies',
  events = 'events',
}

export const navTabs: NavTab[] = [
  {
    id: HostsTabName.hosts,
    name: i18n.NAVIGATION_HOSTS_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.hosts),
    disabled: false,
  },
  {
    id: HostsTabName.authentications,
    name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.authentications),
    disabled: false,
  },
  {
    id: HostsTabName.uncommonProcesses,
    name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.uncommonProcesses),
    disabled: false,
  },
  {
    id: HostsTabName.anomalies,
    name: i18n.NAVIGATION_ANOMALIES_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.anomalies),
    disabled: false,
  },
  {
    id: HostsTabName.events,
    name: i18n.NAVIGATION_EVENTS_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.events),
    disabled: false,
  },
];

export const navTabsHostDatails = (hostName: string): NavTab[] => [
  {
    id: HostsTabName.authentications,
    name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTabName.authentications),
    disabled: false,
  },
  {
    id: HostsTabName.uncommonProcesses,
    name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTabName.uncommonProcesses),
    disabled: false,
  },
  {
    id: HostsTabName.anomalies,
    name: i18n.NAVIGATION_ANOMALIES_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTabName.anomalies),
    disabled: false,
  },
  {
    id: HostsTabName.events,
    name: i18n.NAVIGATION_EVENTS_TITLE,
    href: getTabsOnHostDetailsUrl(hostName, HostsTabName.events),
    disabled: false,
  },
];

interface OwnProps {
  type: hostsModel.HostsType;
  startDate: number;
  endDate: number;
  filterQuery?: string | ESTermQuery;
}
type QueryTabBodyProps = OwnProps & {
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

type AnomaliesQueryTabBodyProps = OwnProps & {
  skip: boolean;
  narrowDateRange: NarrowDateRange;
  hostName?: string;
};

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);

export const HostsQueryTabBody = ({
  endDate,
  filterQuery,
  indexPattern,
  skip,
  setQuery,
  startDate,
  type,
}: QueryTabBodyProps) => {
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
}: QueryTabBodyProps) => {
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
}: QueryTabBodyProps) => {
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
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: QueryTabBodyProps) => {
  return (
    <EventsQuery
      endDate={endDate}
      filterQuery={filterQuery}
      skip={skip}
      sourceId="default"
      startDate={startDate}
      type={type}
    >
      {({ events, loading, id, inspect, refetch, totalCount, pageInfo, loadPage }) => (
        <EventsTableManage
          data={events}
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
    </EventsQuery>
  );
};
