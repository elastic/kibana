/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';

import { ActionCreator } from 'typescript-fsa';
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
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { LastEventIndexKey } from '../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsEmptyPage } from './hosts_empty_page';
import { HostsKql } from './kql';
import * as i18n from './translations';
import { AnomaliesHostTable } from '../../components/ml/tables/anomalies_host_table';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);
const KpiHostsComponentManage = manageQuery(KpiHostsComponent);

interface HostsComponentReduxProps {
  filterQuery: string;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type HostsComponentProps = HostsComponentReduxProps;

const HostsComponent = pure<HostsComponentProps>(({ filterQuery, setAbsoluteRangeDatePicker }) => (
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
                        />
                      )}
                    </KpiHostsQuery>

                    <EuiSpacer />

                    <HostsQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={hostsModel.HostsType.page}
                    >
                      {({
                        hosts,
                        totalCount,
                        loading,
                        pageInfo,
                        loadMore,
                        id,
                        inspect,
                        refetch,
                      }) => (
                        <HostsTableManage
                          id={id}
                          inspect={inspect}
                          indexPattern={indexPattern}
                          refetch={refetch}
                          setQuery={setQuery}
                          loading={loading}
                          data={hosts}
                          totalCount={totalCount}
                          hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                          nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                          loadMore={loadMore}
                          type={hostsModel.HostsType.page}
                        />
                      )}
                    </HostsQuery>

                    <EuiSpacer />

                    <AuthenticationsQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={hostsModel.HostsType.page}
                    >
                      {({
                        authentications,
                        totalCount,
                        loading,
                        pageInfo,
                        loadPage,
                        id,
                        inspect,
                        refetch,
                      }) => (
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

                    <EuiSpacer />

                    <UncommonProcessesQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={hostsModel.HostsType.page}
                    >
                      {({
                        uncommonProcesses,
                        totalCount,
                        loading,
                        pageInfo,
                        loadMore,
                        id,
                        inspect,
                        refetch,
                      }) => (
                        <UncommonProcessTableManage
                          id={id}
                          inspect={inspect}
                          refetch={refetch}
                          setQuery={setQuery}
                          loading={loading}
                          data={uncommonProcesses}
                          totalCount={totalCount}
                          nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                          hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                          loadMore={loadMore}
                          type={hostsModel.HostsType.page}
                        />
                      )}
                    </UncommonProcessesQuery>

                    <EuiSpacer />

                    <AnomaliesHostTable
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

                    <EuiSpacer />

                    <EventsQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={hostsModel.HostsType.page}
                    >
                      {({
                        events,
                        loading,
                        id,
                        inspect,
                        refetch,
                        totalCount,
                        pageInfo,
                        loadMore,
                      }) => (
                        <EventsTableManage
                          id={id}
                          inspect={inspect}
                          refetch={refetch}
                          setQuery={setQuery}
                          data={events!}
                          loading={loading}
                          totalCount={totalCount}
                          nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                          tiebreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)!}
                          hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                          loadMore={loadMore}
                          type={hostsModel.HostsType.page}
                        />
                      )}
                    </EventsQuery>
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
));

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
