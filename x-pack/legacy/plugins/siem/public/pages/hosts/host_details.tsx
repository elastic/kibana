/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';
import { Breadcrumb } from 'ui/chrome';
import { StaticIndexPattern } from 'ui/index_patterns';

import { ActionCreator } from 'typescript-fsa';
import { ESTermQuery } from '../../../common/typed_json';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import {
  getHostsUrl,
  HostComponentProps,
  getHostDetailsUrl,
} from '../../components/link_to/redirect_to_hosts';
import { KpiHostsComponent } from '../../components/page/hosts';

import { HostOverview } from '../../components/page/hosts/host_overview';
import { manageQuery } from '../../components/page/manage_query';
import { UseUrlState } from '../../components/url_state';
import { GlobalTime } from '../../containers/global_time';
import { HostOverviewByNameQuery } from '../../containers/hosts/overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { convertKueryToElasticSearchQuery, escapeQueryValue } from '../../lib/keury';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsEmptyPage } from './hosts_empty_page';
import { HostsKql } from './kql';
import * as i18n from './translations';
import { AnomalyTableProvider } from '../../components/ml/anomaly/anomaly_table_provider';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { KpiHostDetailsQuery } from '../../containers/kpi_host_details';
import { hostToCriteria } from '../../components/ml/criteria/host_to_criteria';
import {
  AuthenticationsQueryTabBody,
  HostsTabName,
  AnomaliesTabBody,
  EventsTabBody,
  UncommonProcessTabBody,
  navTabsHostDatails,
} from './hosts_navigations';
import { SiemNavigation } from '../../components/navigation';

const type = hostsModel.HostsType.details;

const HostOverviewManage = manageQuery(HostOverview);
const KpiHostDetailsManage = manageQuery(KpiHostsComponent);

interface HostDetailsComponentReduxProps {
  filterQueryExpression: string;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type HostDetailsComponentProps = HostDetailsComponentReduxProps & HostComponentProps;

const HostDetailsComponent = pure<HostDetailsComponentProps>(
  ({
    match: {
      params: { hostName, tabName },
    },
    filterQueryExpression,
    setAbsoluteRangeDatePicker,
  }) => {
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <HostsKql indexPattern={indexPattern} type={type} />
              </FiltersGlobal>

              <HeaderPage
                subtitle={
                  <LastEventTime indexKey={LastEventIndexKey.hostDetails} hostName={hostName} />
                }
                title={hostName}
              />

              <GlobalTime>
                {({ to, from, setQuery }) => (
                  <UseUrlState indexPattern={indexPattern}>
                    {({ isInitializing }) => (
                      <>
                        <HostOverviewByNameQuery
                          sourceId="default"
                          hostName={hostName}
                          skip={isInitializing}
                          startDate={from}
                          endDate={to}
                        >
                          {({ hostOverview, loading, id, inspect, refetch }) => (
                            <AnomalyTableProvider
                              criteriaFields={hostToCriteria(hostOverview)}
                              startDate={from}
                              endDate={to}
                              skip={isInitializing}
                            >
                              {({ isLoadingAnomaliesData, anomaliesData }) => (
                                <HostOverviewManage
                                  id={id}
                                  inspect={inspect}
                                  refetch={refetch}
                                  setQuery={setQuery}
                                  data={hostOverview}
                                  anomaliesData={anomaliesData}
                                  isLoadingAnomaliesData={isLoadingAnomaliesData}
                                  loading={loading}
                                  startDate={from}
                                  endDate={to}
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
                            </AnomalyTableProvider>
                          )}
                        </HostOverviewByNameQuery>

                        <EuiHorizontalRule />

                        <KpiHostDetailsQuery
                          sourceId="default"
                          filterQuery={getFilterQuery(
                            hostName,
                            filterQueryExpression,
                            indexPattern
                          )}
                          skip={isInitializing}
                          startDate={from}
                          endDate={to}
                        >
                          {({ kpiHostDetails, id, inspect, loading, refetch }) => (
                            <KpiHostDetailsManage
                              data={kpiHostDetails}
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
                        </KpiHostDetailsQuery>

                        <EuiHorizontalRule />
                        <SiemNavigation
                          navTabs={navTabsHostDatails(hostName)}
                          display="default"
                          showBorder={true}
                        />
                        <EuiSpacer />
                      </>
                    )}
                  </UseUrlState>
                )}
              </GlobalTime>
            </StickyContainer>
          ) : (
            <>
              <HeaderPage title={hostName} />

              <HostsEmptyPage />
            </>
          )
        }
      </WithSource>
    );
  }
);

HostDetailsComponent.displayName = 'HostDetailsComponent';

const HostDetailsBodyComponent = pure<HostDetailsComponentProps>(
  ({
    match: {
      params: { hostName, tabName },
    },
    filterQueryExpression,
    setAbsoluteRangeDatePicker,
  }) => {
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <GlobalTime>
              {({ to, from, setQuery }) => (
                <UseUrlState indexPattern={indexPattern}>
                  {({ isInitializing }) => (
                    <>
                      {(tabName == null || tabName === HostsTabName.authentications) && (
                        <AuthenticationsQueryTabBody
                          endDate={to}
                          filterQuery={getFilterQuery(
                            hostName,
                            filterQueryExpression,
                            indexPattern
                          )}
                          skip={isInitializing}
                          startDate={from}
                          type={type}
                          setQuery={setQuery}
                          indexPattern={indexPattern}
                        />
                      )}

                      {tabName === HostsTabName.uncommonProcesses && (
                        <UncommonProcessTabBody
                          endDate={to}
                          filterQuery={getFilterQuery(
                            hostName,
                            filterQueryExpression,
                            indexPattern
                          )}
                          skip={isInitializing}
                          startDate={from}
                          type={type}
                          setQuery={setQuery}
                          indexPattern={indexPattern}
                        />
                      )}

                      {tabName === HostsTabName.anomalies && (
                        <AnomaliesTabBody
                          startDate={from}
                          endDate={to}
                          skip={isInitializing}
                          type={type}
                          hostName={hostName}
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
                          type={type}
                          setQuery={setQuery}
                          filterQuery={getFilterQuery(
                            hostName,
                            filterQueryExpression,
                            indexPattern
                          )}
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

HostDetailsBodyComponent.displayName = 'HostDetailsBodyComponent';

const makeMapStateToProps = () => {
  const getHostsFilterQuery = hostsSelectors.hostsFilterQueryExpression();
  return (state: State) => ({
    filterQueryExpression: getHostsFilterQuery(state, type) || '',
  });
};

export const HostDetails = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  }
)(HostDetailsComponent);

export const HostDetailsBody = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  }
)(HostDetailsBodyComponent);

export const getBreadcrumbs = (hostId?: string, tabName?: HostsTabName): Breadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getHostsUrl(),
    },
  ];
  if (hostId) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: hostId,
        href: getHostDetailsUrl(hostId),
      },
    ];
  }
  if (tabName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: tabName,
        href: '',
      },
    ];
  }
  return breadcrumb;
};

const getFilterQuery = (
  hostName: string | null,
  filterQueryExpression: string,
  indexPattern: StaticIndexPattern
): ESTermQuery | string =>
  isEmpty(filterQueryExpression)
    ? hostName
      ? { term: { 'host.name': hostName } }
      : ''
    : convertKueryToElasticSearchQuery(
        `${filterQueryExpression} ${
          hostName ? `and host.name: "${escapeQueryValue(hostName)}"` : ''
        }`,
        indexPattern
      );
