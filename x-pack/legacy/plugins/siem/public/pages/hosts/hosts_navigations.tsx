/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { getOr, omit } from 'lodash/fp';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import * as i18n from './translations';

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
import { NavTab } from '../../components/navigation/types';
import { EventsOverTimeQuery } from '../../containers/events/events_over_time';
import { EventsOverTimeHistogram } from '../../components/page/hosts/events_over_time';
import { getFilterQuery } from './details/utils';

const getTabsOnHostsUrl = (tabName: HostsTableType) => `#/hosts/${tabName}`;
const getTabsOnHostDetailsUrl = (hostName: string, tabName: HostsTableType) => {
  return `#/hosts/${hostName}/${tabName}`;
};

type KeyHostsNavTabWithoutMlPermission = HostsTableType.hosts &
  HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission & HostsTableType.anomalies;

export type KeyHostsNavTab = KeyHostsNavTabWithoutMlPermission | KeyHostsNavTabWithMlPermission;

type KeyHostDetailsNavTabWithoutMlPermission = HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostDetailsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission &
  HostsTableType.anomalies;

export type KeyHostDetailsNavTab =
  | KeyHostDetailsNavTabWithoutMlPermission
  | KeyHostDetailsNavTabWithMlPermission;

export type HostsNavTab = Record<KeyHostsNavTab, NavTab>;

export const navTabsHosts = (hasMlUserPermissions: boolean): HostsNavTab => {
  const hostsNavTabs = {
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

  return hasMlUserPermissions ? hostsNavTabs : omit([HostsTableType.anomalies], hostsNavTabs);
};

export const navTabsHostDetails = (
  hostName: string,
  hasMlUserPermissions: boolean
): Record<KeyHostDetailsNavTab, NavTab> => {
  const hostDetailsNavTabs = {
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
  };

  return hasMlUserPermissions
    ? hostDetailsNavTabs
    : omit(HostsTableType.anomalies, hostDetailsNavTabs);
};

interface OwnProps {
  type: hostsModel.HostsType;
  startDate: number;
  endDate: number;
  filterQuery?: string | ESTermQuery;
  kqlQueryExpression: string;
}
export type HostsComponentsQueryProps = OwnProps & {
  deleteQuery?: ({ id }: { id: string }) => void;
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
  filterQueryExpression?: string;
  hostName?: string;
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
  deleteQuery,
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
      {({ hosts, totalCount, loading, pageInfo, loadPage, id, inspect, isInspected, refetch }) => (
        <HostsTableManage
          deleteQuery={deleteQuery}
          data={hosts}
          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
          id={id}
          indexPattern={indexPattern}
          inspect={inspect}
          isInspect={isInspected}
          loading={loading}
          loadPage={loadPage}
          refetch={refetch}
          setQuery={setQuery}
          showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
          totalCount={totalCount}
          type={type}
        />
      )}
    </HostsQuery>
  );
};

export const AuthenticationsQueryTabBody = ({
  deleteQuery,
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
      {({
        authentications,
        totalCount,
        loading,
        pageInfo,
        loadPage,
        id,
        inspect,
        isInspected,
        refetch,
      }) => {
        return (
          <AuthenticationTableManage
            data={authentications}
            deleteQuery={deleteQuery}
            fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
            id={id}
            inspect={inspect}
            isInspect={isInspected}
            loading={loading}
            loadPage={loadPage}
            refetch={refetch}
            showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
            setQuery={setQuery}
            totalCount={totalCount}
            type={type}
          />
        );
      }}
    </AuthenticationsQuery>
  );
};

export const UncommonProcessTabBody = ({
  deleteQuery,
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
      {({
        uncommonProcesses,
        totalCount,
        loading,
        pageInfo,
        loadPage,
        id,
        inspect,
        isInspected,
        refetch,
      }) => (
        <UncommonProcessTableManage
          deleteQuery={deleteQuery}
          data={uncommonProcesses}
          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
          id={id}
          inspect={inspect}
          isInspect={isInspected}
          loading={loading}
          loadPage={loadPage}
          refetch={refetch}
          setQuery={setQuery}
          showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
          totalCount={totalCount}
          type={type}
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
const EventsOverTimeManage = manageQuery(EventsOverTimeHistogram);

export const EventsTabBody = ({
  endDate,
  kqlQueryExpression,
  startDate,
  setQuery,
  filterQueryExpression,
  hostName,
  indexPattern,
}: HostsComponentsQueryProps) => {
  const HOSTS_PAGE_TIMELINE_ID = 'hosts-page';
  const filterQuery = filterQueryExpression
    ? getFilterQuery(hostName || null, filterQueryExpression, indexPattern)
    : '';
  return (
    <>
      <EventsOverTimeQuery
        endDate={endDate}
        filterQuery={filterQuery}
        sourceId="default"
        startDate={startDate}
        type={hostsModel.HostsType.page}
      >
        {({ eventsOverTime, loading, id, inspect, refetch }) => (
          <EventsOverTimeManage
            id={id}
            inspect={inspect}
            refetch={refetch}
            setQuery={setQuery}
            data={eventsOverTime!}
            loading={loading}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </EventsOverTimeQuery>
      <EuiSpacer size="l" />
      <StatefulEventsViewer
        end={endDate}
        id={HOSTS_PAGE_TIMELINE_ID}
        kqlQueryExpression={kqlQueryExpression}
        start={startDate}
      />
    </>
  );
};
