/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { Breadcrumb } from 'ui/chrome';

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { getNetworkUrl } from '../../components/link_to/redirect_to_network';
import { AnomalyTableProvider } from '../../components/ml/anomaly/anomaly_table_provider';
import { networkToCriteria } from '../../components/ml/criteria/network_to_criteria';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { AnomaliesNetworkTable } from '../../components/ml/tables/anomalies_network_table';
import { manageQuery } from '../../components/page/manage_query';
import { FlowTargetSelectConnected } from '../../components/page/network/flow_target_select_connected';
import { IpOverview } from '../../components/page/network/ip_overview';
import { NetworkTopNFlowTable } from '../../components/page/network/network_top_n_flow_table';
import { TlsTable } from '../../components/page/network/tls_table';
import { UsersTable } from '../../components/page/network/users_table';
import { SiemSearchBar } from '../../components/search_bar';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { NetworkTopNFlowQuery } from '../../containers/network_top_n_flow';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { TlsQuery } from '../../containers/tls';
import { UsersQuery } from '../../containers/users';
import { FlowTargetSourceDest, LastEventIndexKey } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { convertToBuildEsQuery } from '../../lib/keury';
import { ConditionalFlexGroup } from '../../pages/network/navigation/conditional_flex_group';
import { networkModel, networkSelectors, State, inputsSelectors } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { setIpDetailsTablesActivePageToZero as dispatchIpDetailsTablesActivePageToZero } from '../../store/network/actions';
import { SpyRoute } from '../../utils/route/spy_routes';
import { NetworkEmptyPage } from './network_empty_page';
import { NetworkTopCountriesQuery } from '../../containers/network_top_countries';
import { NetworkTopCountriesTable } from '../../components/page/network/network_top_countries_table';
import * as i18n from './translations';
import { IPDetailsComponentProps } from './types';

const TlsTableManage = manageQuery(TlsTable);
const UsersTableManage = manageQuery(UsersTable);
const IpOverviewManage = manageQuery(IpOverview);
const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);
const NetworkTopCountriesTableManage = manageQuery(NetworkTopCountriesTable);

export const IPDetailsComponent = React.memo<IPDetailsComponentProps>(
  ({
    detailName,
    filters,
    flowTarget,
    from,
    isInitializing,
    query,
    setAbsoluteRangeDatePicker,
    setIpDetailsTablesActivePageToZero,
    setQuery,
    to,
  }) => {
    useEffect(() => {
      setIpDetailsTablesActivePageToZero(null);
    }, [detailName]);
    return (
      <>
        <WithSource sourceId="default" data-test-subj="ip-details-page">
          {({ indicesExist, indexPattern }) => {
            const ip = decodeIpv6(detailName);
            const filterQuery = convertToBuildEsQuery({
              indexPattern,
              queries: [query],
              filters,
            });
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar indexPattern={indexPattern} id="global" />
                </FiltersGlobal>

                <HeaderPage
                  data-test-subj="ip-details-headline"
                  subtitle={<LastEventTime indexKey={LastEventIndexKey.ipDetails} ip={ip} />}
                  title={ip}
                  draggableArguments={{ field: `${flowTarget}.ip`, value: ip }}
                >
                  <FlowTargetSelectConnected />
                </HeaderPage>

                <IpOverviewQuery
                  skip={isInitializing}
                  sourceId="default"
                  filterQuery={filterQuery}
                  type={networkModel.NetworkType.details}
                  ip={ip}
                >
                  {({ id, inspect, ipOverviewData, loading, refetch }) => (
                    <AnomalyTableProvider
                      criteriaFields={networkToCriteria(detailName, flowTarget)}
                      startDate={from}
                      endDate={to}
                      skip={isInitializing}
                    >
                      {({ isLoadingAnomaliesData, anomaliesData }) => (
                        <IpOverviewManage
                          id={id}
                          inspect={inspect}
                          ip={ip}
                          data={ipOverviewData}
                          anomaliesData={anomaliesData}
                          loading={loading}
                          isLoadingAnomaliesData={isLoadingAnomaliesData}
                          type={networkModel.NetworkType.details}
                          flowTarget={flowTarget}
                          refetch={refetch}
                          setQuery={setQuery}
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
                </IpOverviewQuery>

                <EuiHorizontalRule />

                <ConditionalFlexGroup direction="column">
                  <EuiFlexItem>
                    <NetworkTopNFlowQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      flowTarget={FlowTargetSourceDest.source}
                      ip={ip}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={networkModel.NetworkType.details}
                    >
                      {({
                        id,
                        inspect,
                        isInspected,
                        loading,
                        loadPage,
                        networkTopNFlow,
                        pageInfo,
                        refetch,
                        totalCount,
                      }) => (
                        <NetworkTopNFlowTableManage
                          data={networkTopNFlow}
                          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                          flowTargeted={FlowTargetSourceDest.source}
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
                          type={networkModel.NetworkType.details}
                        />
                      )}
                    </NetworkTopNFlowQuery>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <NetworkTopNFlowQuery
                      endDate={to}
                      flowTarget={FlowTargetSourceDest.destination}
                      filterQuery={filterQuery}
                      ip={ip}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={networkModel.NetworkType.details}
                    >
                      {({
                        id,
                        inspect,
                        isInspected,
                        loading,
                        loadPage,
                        networkTopNFlow,
                        pageInfo,
                        refetch,
                        totalCount,
                      }) => (
                        <NetworkTopNFlowTableManage
                          data={networkTopNFlow}
                          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                          flowTargeted={FlowTargetSourceDest.destination}
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
                          type={networkModel.NetworkType.details}
                        />
                      )}
                    </NetworkTopNFlowQuery>
                  </EuiFlexItem>
                </ConditionalFlexGroup>

                <EuiSpacer />

                <ConditionalFlexGroup direction="column">
                  <EuiFlexItem>
                    <NetworkTopCountriesQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      flowTarget={FlowTargetSourceDest.source}
                      ip={ip}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={networkModel.NetworkType.details}
                    >
                      {({
                        id,
                        inspect,
                        isInspected,
                        loading,
                        loadPage,
                        networkTopCountries,
                        pageInfo,
                        refetch,
                        totalCount,
                      }) => (
                        <NetworkTopCountriesTableManage
                          data={networkTopCountries}
                          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                          flowTargeted={FlowTargetSourceDest.source}
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
                          type={networkModel.NetworkType.details}
                        />
                      )}
                    </NetworkTopCountriesQuery>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <NetworkTopCountriesQuery
                      endDate={to}
                      flowTarget={FlowTargetSourceDest.destination}
                      filterQuery={filterQuery}
                      ip={ip}
                      skip={isInitializing}
                      sourceId="default"
                      startDate={from}
                      type={networkModel.NetworkType.details}
                    >
                      {({
                        id,
                        inspect,
                        isInspected,
                        loading,
                        loadPage,
                        networkTopCountries,
                        pageInfo,
                        refetch,
                        totalCount,
                      }) => (
                        <NetworkTopCountriesTableManage
                          data={networkTopCountries}
                          fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                          flowTargeted={FlowTargetSourceDest.destination}
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
                          type={networkModel.NetworkType.details}
                        />
                      )}
                    </NetworkTopCountriesQuery>
                  </EuiFlexItem>
                </ConditionalFlexGroup>

                <EuiSpacer />

                <UsersQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  flowTarget={flowTarget}
                  ip={ip}
                  skip={isInitializing}
                  sourceId="default"
                  startDate={from}
                  type={networkModel.NetworkType.details}
                >
                  {({
                    id,
                    inspect,
                    isInspected,
                    users,
                    totalCount,
                    pageInfo,
                    loading,
                    loadPage,
                    refetch,
                  }) => (
                    <UsersTableManage
                      data={users}
                      id={id}
                      inspect={inspect}
                      isInspect={isInspected}
                      flowTarget={flowTarget}
                      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                      loading={loading}
                      loadPage={loadPage}
                      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
                      refetch={refetch}
                      setQuery={setQuery}
                      totalCount={totalCount}
                      type={networkModel.NetworkType.details}
                    />
                  )}
                </UsersQuery>

                <EuiSpacer />

                <TlsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  flowTarget={(flowTarget as unknown) as FlowTargetSourceDest}
                  ip={ip}
                  skip={isInitializing}
                  sourceId="default"
                  startDate={from}
                  type={networkModel.NetworkType.details}
                >
                  {({
                    id,
                    inspect,
                    isInspected,
                    tls,
                    totalCount,
                    pageInfo,
                    loading,
                    loadPage,
                    refetch,
                  }) => (
                    <TlsTableManage
                      data={tls}
                      id={id}
                      inspect={inspect}
                      isInspect={isInspected}
                      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                      loading={loading}
                      loadPage={loadPage}
                      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
                      refetch={refetch}
                      setQuery={setQuery}
                      totalCount={totalCount}
                      type={networkModel.NetworkType.details}
                    />
                  )}
                </TlsQuery>

                <EuiSpacer />

                <AnomaliesNetworkTable
                  startDate={from}
                  endDate={to}
                  skip={isInitializing}
                  ip={ip}
                  type={networkModel.NetworkType.details}
                  flowTarget={flowTarget}
                  narrowDateRange={(score, interval) => {
                    const fromTo = scoreIntervalToDateTime(score, interval);
                    setAbsoluteRangeDatePicker({
                      id: 'global',
                      from: fromTo.from,
                      to: fromTo.to,
                    });
                  }}
                />
              </StickyContainer>
            ) : (
              <>
                <HeaderPage title={ip} />

                <NetworkEmptyPage />
              </>
            );
          }}
        </WithSource>
        <SpyRoute />
      </>
    );
  }
);

IPDetailsComponent.displayName = 'IPDetailsComponent';

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  return (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
    flowTarget: getIpDetailsFlowTargetSelector(state),
  });
};

export const IPDetails = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
    setIpDetailsTablesActivePageToZero: dispatchIpDetailsTablesActivePageToZero,
  }
)(IPDetailsComponent);

export const getBreadcrumbs = (ip: string | undefined, search: string[]): Breadcrumb[] => {
  const breadcrumbs = [
    {
      text: i18n.PAGE_TITLE,
      href: `${getNetworkUrl()}${search && search[0] ? search[0] : ''}`,
    },
  ];
  if (ip) {
    return [
      ...breadcrumbs,
      {
        text: decodeIpv6(ip),
        href: '',
      },
    ];
  } else {
    return breadcrumbs;
  }
};
