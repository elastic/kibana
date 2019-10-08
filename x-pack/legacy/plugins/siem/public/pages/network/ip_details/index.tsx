/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';

import { GlobalTime } from '../../../containers/global_time';
import { FiltersGlobal } from '../../../components/filters_global';
import { HeaderPage } from '../../../components/header_page';
import { LastEventTime } from '../../../components/last_event_time';
import { FlowTargetSelectConnected } from '../../../components/page/network/flow_target_select_connected';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../../containers/source';
import { LastEventIndexKey } from '../../../graphql/types';
import { decodeIpv6 } from '../../../lib/helpers';
import { networkModel, networkSelectors, State } from '../../../store';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../store/inputs/actions';

import { NetworkKql } from '../kql';
import { NetworkEmptyPage } from '../network_empty_page';
import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';
import { SpyRoute } from '../../../utils/route/spy_routes';

import { IpOverview } from '../../../components/page/network/ip_overview';
import { IpOverviewQuery } from '../../../containers/ip_overview';
import { manageQuery } from '../../../components/page/manage_query';
import { AnomalyTableProvider } from '../../../components/ml/anomaly/anomaly_table_provider';
import { networkToCriteria } from '../../../components/ml/criteria/network_to_criteria';
import { AnomaliesNetworkTable } from '../../../components/ml/tables/anomalies_network_table';

import { IPDetailsComponentProps } from './types';
export { getBreadcrumbs } from './utils';
import { TlsQueryTable } from './tls_query_table';
import { UsersQueryTable } from './users_query_table';
import { DomainsQueryTable } from './domains_query_table';

const IpOverviewManage = manageQuery(IpOverview);

export const IPDetailsComponent = pure<IPDetailsComponentProps>(
  ({ detailName, filterQuery, flowTarget, setAbsoluteRangeDatePicker }) => {
    const narrowDateRange = useCallback(
      (score, interval) => {
        const fromTo = scoreIntervalToDateTime(score, interval);
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        });
      },
      [scoreIntervalToDateTime, setAbsoluteRangeDatePicker]
    );

    return (
      <>
        <WithSource sourceId="default" data-test-subj="ip-details-page">
          {({ indicesExist, indexPattern }) => {
            const ip = decodeIpv6(detailName);

            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <GlobalTime>
                  {({ to, from, setQuery, isInitializing }) => (
                    <>
                      <FiltersGlobal>
                        <NetworkKql
                          indexPattern={indexPattern}
                          setQuery={setQuery}
                          type={networkModel.NetworkType.details}
                        />
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
                                narrowDateRange={narrowDateRange}
                              />
                            )}
                          </AnomalyTableProvider>
                        )}
                      </IpOverviewQuery>

                      <EuiHorizontalRule />

                      <DomainsQueryTable
                        endDate={to}
                        filterQuery={filterQuery}
                        flowTarget={flowTarget}
                        ip={ip}
                        skip={isInitializing}
                        startDate={from}
                        indexPattern={indexPattern}
                        type={networkModel.NetworkType.details}
                        setQuery={setQuery}
                      />

                      <EuiSpacer />

                      <UsersQueryTable
                        endDate={to}
                        filterQuery={filterQuery}
                        flowTarget={flowTarget}
                        ip={ip}
                        skip={isInitializing}
                        startDate={from}
                        setQuery={setQuery}
                        type={networkModel.NetworkType.details}
                      />

                      <EuiSpacer />

                      <TlsQueryTable
                        endDate={to}
                        filterQuery={filterQuery}
                        flowTarget={flowTarget}
                        ip={ip}
                        setQuery={setQuery}
                        skip={isInitializing}
                        startDate={from}
                        type={networkModel.NetworkType.details}
                      />

                      <EuiSpacer />

                      <AnomaliesNetworkTable
                        startDate={from}
                        endDate={to}
                        skip={isInitializing}
                        ip={ip}
                        type={networkModel.NetworkType.details}
                        flowTarget={flowTarget}
                        narrowDateRange={narrowDateRange}
                      />
                    </>
                  )}
                </GlobalTime>
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
