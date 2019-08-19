/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { getOr, get } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';

import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';
import { RouteComponentProps } from 'react-router-dom';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import {
  EventsTable,
  HostsTable,
  KpiHostsComponent,
  UncommonProcessTable,
} from '../../components/page/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { manageQuery } from '../../components/page/manage_query';
import { UseUrlState } from '../../components/url_state';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
import { KpiHostsQuery } from '../../containers/kpi_hosts';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsEmptyPage } from './hosts_empty_page';
import { HostsKql } from './kql';
import { AnomaliesHostTable } from '../../components/ml/tables/anomalies_host_table';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { NavTab } from '../../components/navigation/tab_navigation';
import { getTabsOnHostsUrl, getHostsUrl } from '../../components/link_to';
import { SiemNavigation } from '../../components/navigation';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { InspectQuery, Refetch } from '../../store/inputs/model';
import { NarrowDateRange } from '../../components/ml/types';
import * as i18n from './translations';

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);
const KpiHostsComponentManage = manageQuery(KpiHostsComponent);

export enum HostsTabName {
  hosts = 'hosts',
  authentications = 'authentications',
  uncommonProcesses = 'uncommon_processes',
  anomalies = 'anomalies',
  events = 'events',
}

const navTabs: NavTab[] = [
  {
    id: HostsTabName.hosts,
    name: i18n.NAVIGATION_HOSTS_TITLE,
    href: getHostsUrl(),
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

interface HostsComponentReduxProps {
  filterQuery: string;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type HostsComponentProps = RouteComponentProps & HostsComponentReduxProps;
interface OwnProps {
  type: hostsModel.HostsType;
  startDate: number;
  endDate: number;
  filterQuery?: string;
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
};

const HostsQueryTabBody = ({
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

const AuthenticationsQueryTabBody = ({
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

const UncommonProcessTabBody = ({
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

const AnomaliesTabBody = ({
  endDate,
  skip,
  startDate,
  type,
  narrowDateRange,
}: AnomaliesQueryTabBodyProps) => {
  return (
    <AnomaliesHostTable
      startDate={startDate}
      endDate={endDate}
      skip={skip}
      type={type}
      narrowDateRange={narrowDateRange}
    />
  );
};

const EventsTabBody = ({
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

const HostsComponent = pure<HostsComponentProps>(
  ({ filterQuery, setAbsoluteRangeDatePicker, match }) => {
    const tabName = get('params.tabName', match);
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <HostsKql indexPattern={indexPattern} type={hostsModel.HostsType.page} />
              </FiltersGlobal>

              <HeaderPage
                subtitle={<LastEventTime indexKey={LastEventIndexKey.hosts} />}
                title={i18n.PAGE_TITLE}
              />

              <GlobalTime>
                {({ to, from, setQuery }) => (
                  <UseUrlState indexPattern={indexPattern}>
                    {({ isInitializing }) => (
                      <>
                        <KpiHostsQuery
                          endDate={to}
                          filterQuery={filterQuery}
                          skip={isInitializing}
                          sourceId="default"
                          startDate={from}
                        >
                          {({ kpiHosts, loading, id, inspect, refetch }) => (
                            <KpiHostsComponentManage
                              data={kpiHosts}
                              from={from}
                              id={id}
                              inspect={inspect}
                              loading={loading}
                              refetch={refetch}
                              setQuery={setQuery}
                              to={to}
                              narrowDateRange={(min: number, max: number) => {
                                setTimeout(() => {
                                  setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
                                }, 500);
                              }}
                            />
                          )}
                        </KpiHostsQuery>
                        <EuiSpacer />
                        <SiemNavigation navTabs={navTabs} display="default" showBorder={true} />
                        <EuiSpacer />
                        {tabName == null && (
                          <HostsQueryTabBody
                            endDate={to}
                            filterQuery={filterQuery}
                            skip={isInitializing}
                            setQuery={setQuery}
                            startDate={from}
                            type={hostsModel.HostsType.page}
                            indexPattern={indexPattern}
                          />
                        )}
                        {tabName === 'authentications' && (
                          <AuthenticationsQueryTabBody
                            endDate={to}
                            filterQuery={filterQuery}
                            skip={isInitializing}
                            startDate={from}
                            type={hostsModel.HostsType.page}
                            setQuery={setQuery}
                            indexPattern={indexPattern}
                          />
                        )}
                        {tabName === 'uncommon_processes' && (
                          <UncommonProcessTabBody
                            endDate={to}
                            filterQuery={filterQuery}
                            skip={isInitializing}
                            startDate={from}
                            type={hostsModel.HostsType.page}
                            setQuery={setQuery}
                            indexPattern={indexPattern}
                          />
                        )}
                        {tabName === 'anomalies' && (
                          <AnomaliesTabBody
                            startDate={from}
                            endDate={to}
                            skip={isInitializing}
                            type={hostsModel.HostsType.page}
                            narrowDateRange={(score, interval) => {
                              const fromTo = scoreIntervalToDateTime(score, interval);
                              setAbsoluteRangeDatePicker({
                                id: 'global',
                                from: fromTo.from,
                                to: fromTo.to,
                              });
                            }}
                          />
                        )}
                        {tabName === 'events' && (
                          <EventsTabBody
                            startDate={from}
                            endDate={to}
                            skip={isInitializing}
                            type={hostsModel.HostsType.page}
                            narrowDateRange={(score, interval) => {
                              const fromTo = scoreIntervalToDateTime(score, interval);
                              setAbsoluteRangeDatePicker({
                                id: 'global',
                                from: fromTo.from,
                                to: fromTo.to,
                              });
                            }}
                            setQuery={setQuery}
                            indexPattern={indexPattern}
                          />
                        )}
                      </>
                    )}
                  </UseUrlState>
                )}
              </GlobalTime>
            </StickyContainer>
          ) : (
            <>
              <HeaderPage title={i18n.PAGE_TITLE} />
              <HostsEmptyPage />
            </>
          )
        }
      </WithSource>
    );
  }
);

HostsComponent.displayName = 'HostsComponent';

const makeMapStateToProps = () => {
  const getHostsFilterQueryAsJson = hostsSelectors.hostsFilterQueryAsJson();
  const mapStateToProps = (state: State) => ({
    filterQuery: getHostsFilterQueryAsJson(state, hostsModel.HostsType.page) || '',
  });
  return mapStateToProps;
};

export const Hosts = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
  }
)(HostsComponent);
