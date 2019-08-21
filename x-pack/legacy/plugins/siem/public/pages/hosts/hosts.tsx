/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';

import { ActionCreator } from 'typescript-fsa';
import { RouteComponentProps } from 'react-router-dom';
import { get } from 'lodash/fp';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { KpiHostsComponent } from '../../components/page/hosts';
import { manageQuery } from '../../components/page/manage_query';
import { UseUrlState } from '../../components/url_state';
import { GlobalTime } from '../../containers/global_time';
import { KpiHostsQuery } from '../../containers/kpi_hosts';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsEmptyPage } from './hosts_empty_page';
import { HostsKql } from './kql';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { SiemNavigation } from '../../components/navigation';

import * as i18n from './translations';
import {
  UncommonProcessTabBody,
  navTabs,
  HostsTabName,
  HostsQueryTabBody,
  AuthenticationsQueryTabBody,
  AnomaliesTabBody,
  EventsTabBody,
} from './hosts_navigations';

const KpiHostsComponentManage = manageQuery(KpiHostsComponent);

interface HostsComponentReduxProps {
  filterQuery: string;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type HostsComponentProps = RouteComponentProps & HostsComponentReduxProps;

const HostsComponent = pure<HostsComponentProps>(
  ({ filterQuery, setAbsoluteRangeDatePicker, match }) => {
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

const HostsBodyComponent = pure<HostsComponentProps>(
  ({ filterQuery, setAbsoluteRangeDatePicker, match }) => {
    const tabName = get('params.tabName', match);
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <GlobalTime>
              {({ to, from, setQuery }) => (
                <UseUrlState indexPattern={indexPattern}>
                  {({ isInitializing }) => (
                    <>
                      {(tabName == null || tabName === HostsTabName.hosts) && (
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
                      {tabName === HostsTabName.authentications && (
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
                      {tabName === HostsTabName.uncommonProcesses && (
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
                      {tabName === HostsTabName.anomalies && (
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
                      {tabName === HostsTabName.events && (
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
          ) : null
        }
      </WithSource>
    );
  }
);

HostsBodyComponent.displayName = 'HostsBodyComponent';

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

export const HostsBody = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
  }
)(HostsBodyComponent);
