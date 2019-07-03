/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';
import { Breadcrumb } from 'ui/chrome';

import { ActionCreator } from 'typescript-fsa';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { getNetworkUrl, NetworkComponentProps } from '../../components/link_to/redirect_to_network';
import { manageQuery } from '../../components/page/manage_query';
import { DomainsTable } from '../../components/page/network/domains_table';
import { FlowTargetSelectConnected } from '../../components/page/network/flow_target_select_connected';
import { IpOverview } from '../../components/page/network/ip_overview';
import { UsersTable } from '../../components/page/network/users_table';
import { TlsTable } from '../../components/page/network/tls_table';
import { UseUrlState } from '../../components/url_state';
import { DomainsQuery } from '../../containers/domains';
import { GlobalTime } from '../../containers/global_time';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { TlsQuery } from '../../containers/tls';
import { UsersQuery } from '../../containers/users';
import { FlowTarget, LastEventIndexKey } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { networkModel, networkSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../store/inputs/actions';

import { NetworkKql } from './kql';
import { NetworkEmptyPage } from './network_empty_page';
import * as i18n from './translations';
import { AnomalyTableProvider } from '../../components/ml/anomaly/anomaly_table_provider';
import { networkToInfluencers } from '../../components/ml/influencers/network_to_influencers';
import { InputsModelId } from '../../store/inputs/constants';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';

const DomainsTableManage = manageQuery(DomainsTable);
const TlsTableManage = manageQuery(TlsTable);
const UsersTableManage = manageQuery(UsersTable);
const IpOverviewManage = manageQuery(IpOverview);

interface IPDetailsComponentReduxProps {
  filterQuery: string;
  flowTarget: FlowTarget;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

export type IPDetailsComponentProps = IPDetailsComponentReduxProps & NetworkComponentProps;

export const IPDetailsComponent = pure<IPDetailsComponentProps>(
  ({
    match: {
      params: { ip },
    },
    filterQuery,
    flowTarget,
    setAbsoluteRangeDatePicker,
  }) => (
    <WithSource sourceId="default" data-test-subj="ip-details-page">
      {({ indicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
          <StickyContainer>
            <FiltersGlobal>
              <NetworkKql indexPattern={indexPattern} type={networkModel.NetworkType.details} />
            </FiltersGlobal>

            <HeaderPage
              data-test-subj="ip-details-headline"
              subtitle={
                <LastEventTime indexKey={LastEventIndexKey.ipDetails} ip={decodeIpv6(ip)} />
              }
              title={decodeIpv6(ip)}
            >
              <FlowTargetSelectConnected />
            </HeaderPage>

            <GlobalTime>
              {({ to, from, setQuery }) => (
                <UseUrlState indexPattern={indexPattern}>
                  {({ isInitializing }) => (
                    <>
                      <IpOverviewQuery
                        skip={isInitializing}
                        sourceId="default"
                        filterQuery={filterQuery}
                        type={networkModel.NetworkType.details}
                        ip={decodeIpv6(ip)}
                      >
                        {({ id, inspect, ipOverviewData, loading, refetch }) => (
                          <AnomalyTableProvider
                            influencers={networkToInfluencers(ip)}
                            startDate={from}
                            endDate={to}
                          >
                            {({ isLoadingAnomaliesData, anomaliesData }) => (
                              <IpOverviewManage
                                id={id}
                                inspect={inspect}
                                ip={decodeIpv6(ip)}
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

                      <DomainsQuery
                        endDate={to}
                        filterQuery={filterQuery}
                        flowTarget={flowTarget}
                        ip={decodeIpv6(ip)}
                        skip={isInitializing}
                        sourceId="default"
                        startDate={from}
                        type={networkModel.NetworkType.details}
                      >
                        {({
                          id,
                          inspect,
                          domains,
                          totalCount,
                          pageInfo,
                          loading,
                          loadMore,
                          refetch,
                        }) => (
                          <DomainsTableManage
                            data={domains}
                            indexPattern={indexPattern}
                            id={id}
                            inspect={inspect}
                            flowTarget={flowTarget}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            ip={ip}
                            loading={loading}
                            loadMore={loadMore}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                            refetch={refetch}
                            setQuery={setQuery}
                            totalCount={totalCount}
                            type={networkModel.NetworkType.details}
                          />
                        )}
                      </DomainsQuery>

                      <EuiSpacer />

                      <UsersQuery
                        endDate={to}
                        filterQuery={filterQuery}
                        flowTarget={flowTarget}
                        ip={decodeIpv6(ip)}
                        skip={isInitializing}
                        sourceId="default"
                        startDate={from}
                        type={networkModel.NetworkType.details}
                      >
                        {({
                          id,
                          inspect,
                          users,
                          totalCount,
                          pageInfo,
                          loading,
                          loadMore,
                          refetch,
                        }) => (
                          <UsersTableManage
                            data={users}
                            id={id}
                            inspect={inspect}
                            flowTarget={flowTarget}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            loading={loading}
                            loadMore={loadMore}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
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
                        flowTarget={flowTarget}
                        ip={decodeIpv6(ip)}
                        skip={isInitializing}
                        sourceId="default"
                        startDate={from}
                        type={networkModel.NetworkType.details}
                      >
                        {({
                          id,
                          inspect,
                          tls,
                          totalCount,
                          pageInfo,
                          loading,
                          loadMore,
                          refetch,
                        }) => (
                          <TlsTableManage
                            data={tls}
                            id={id}
                            inspect={inspect}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo) || false}
                            loading={loading}
                            loadMore={loadMore}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                            refetch={refetch}
                            setQuery={setQuery}
                            totalCount={totalCount}
                            type={networkModel.NetworkType.details}
                          />
                        )}
                      </TlsQuery>
                    </>
                  )}
                </UseUrlState>
              )}
            </GlobalTime>
          </StickyContainer>
        ) : (
          <>
            <HeaderPage title={decodeIpv6(ip)} />

            <NetworkEmptyPage />
          </>
        )
      }
    </WithSource>
  )
);

const makeMapStateToProps = () => {
  const getNetworkFilterQuery = networkSelectors.networkFilterQueryAsJson();
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  return (state: State) => ({
    filterQuery: getNetworkFilterQuery(state, networkModel.NetworkType.details) || '',
    flowTarget: getIpDetailsFlowTargetSelector(state),
  });
};

export const IPDetails = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  }
)(IPDetailsComponent);

export const getBreadcrumbs = (ip: string): Breadcrumb[] => [
  {
    text: i18n.PAGE_TITLE,
    href: getNetworkUrl(),
  },
  {
    text: decodeIpv6(ip),
  },
];
