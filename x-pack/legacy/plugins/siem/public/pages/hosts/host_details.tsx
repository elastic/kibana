/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { isEmpty, get } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
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
import { navTabsHostDetails } from './hosts_navigations';
import { SiemNavigation } from '../../components/navigation';
import { Anomaly } from '../../components/ml/types';
import { NavigationParams } from '../../components/navigation/breadcrumbs';
import { HostsTableType } from '../../store/hosts/model';
import { HostsQueryProps } from './hosts';
import { getHostDetailsEventsKqlQueryExpression } from './helpers';

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

type HostDetailsComponentProps = HostDetailsComponentReduxProps &
  HostComponentProps &
  HostsQueryProps;

const HostDetailsComponent = React.memo<HostDetailsComponentProps>(
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
                {({ to, from, setQuery, isInitializing }) => (
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
                      filterQuery={getFilterQuery(hostName, filterQueryExpression, indexPattern)}
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
                            /**
                             * Using setTimeout here because of this issue:
                             * https://github.com/elastic/elastic-charts/issues/360
                             * Need to remove the setTimeout here after this issue is fixed.
                             * */
                            setTimeout(() => {
                              setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
                            }, 500);
                          }}
                        />
                      )}
                    </KpiHostDetailsQuery>

                    <EuiHorizontalRule />
                    <SiemNavigation
                      navTabs={navTabsHostDetails(hostName)}
                      display="default"
                      showBorder={true}
                    />
                    <EuiSpacer />
                  </>
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

const HostDetailsBodyComponent = React.memo<HostDetailsComponentProps>(
  ({
    match: {
      params: { hostName, tabName },
    },
    filterQueryExpression,
    setAbsoluteRangeDatePicker,
    children,
  }) => {
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <GlobalTime>
              {({ to, from, setQuery, isInitializing }) => (
                <>
                  {children({
                    endDate: to,
                    filterQuery: getFilterQuery(hostName, filterQueryExpression, indexPattern),
                    kqlQueryExpression: getHostDetailsEventsKqlQueryExpression({
                      filterQueryExpression,
                      hostName,
                    }),
                    skip: isInitializing,
                    setQuery,
                    startDate: from,
                    type,
                    indexPattern,
                    narrowDateRange: (score: Anomaly, interval: string) => {
                      const fromTo = scoreIntervalToDateTime(score, interval);
                      setAbsoluteRangeDatePicker({
                        id: 'global',
                        from: fromTo.from,
                        to: fromTo.to,
                      });
                    },
                  })}
                </>
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

const TabNameMappedToI18nKey = {
  [HostsTableType.hosts]: i18n.NAVIGATION_ALL_HOSTS_TITLE,
  [HostsTableType.authentications]: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
  [HostsTableType.uncommonProcesses]: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
  [HostsTableType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [HostsTableType.events]: i18n.NAVIGATION_EVENTS_TITLE,
};

export const getBreadcrumbs = (params: NavigationParams): Breadcrumb[] => {
  const hostName = get('hostName', params);
  const tabName = get('tabName', params);
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getHostsUrl(),
    },
  ];
  if (hostName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: hostName,
        href: getHostDetailsUrl(hostName),
      },
    ];
  }
  if (tabName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: TabNameMappedToI18nKey[tabName],
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
