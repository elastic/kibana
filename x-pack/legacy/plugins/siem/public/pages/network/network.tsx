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
import { manageQuery } from '../../components/page/manage_query';
import { KpiNetworkComponent, NetworkTopNFlowTable } from '../../components/page/network';
import { NetworkDnsTable } from '../../components/page/network/network_dns_table';
import { UseUrlState } from '../../components/url_state';
import { GlobalTime } from '../../containers/global_time';
import { KpiNetworkQuery } from '../../containers/kpi_network';
import { NetworkDnsQuery } from '../../containers/network_dns';
import { NetworkTopNFlowQuery } from '../../containers/network_top_n_flow';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { networkModel, networkSelectors, State } from '../../store';

import { NetworkKql } from './kql';
import { NetworkEmptyPage } from './network_empty_page';
import * as i18n from './translations';
import { AnomaliesNetworkTable } from '../../components/ml/tables/anomalies_network_table';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);
const NetworkDnsTableManage = manageQuery(NetworkDnsTable);
const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
interface NetworkComponentReduxProps {
  filterQuery: string;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type NetworkComponentProps = NetworkComponentReduxProps;
const NetworkComponent = pure<NetworkComponentProps>(
  ({ filterQuery, setAbsoluteRangeDatePicker }) => (
    <WithSource sourceId="default">
      {({ indicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
          <StickyContainer>
            <FiltersGlobal>
              <NetworkKql indexPattern={indexPattern} type={networkModel.NetworkType.page} />
            </FiltersGlobal>

            <HeaderPage
              subtitle={<LastEventTime indexKey={LastEventIndexKey.network} />}
              title={i18n.PAGE_TITLE}
            />

            <GlobalTime>
              {({ to, from, setQuery }) => (
                <UseUrlState indexPattern={indexPattern}>
                  {({ isInitializing }) => (
                    <>
                      <KpiNetworkQuery
                        endDate={to}
                        filterQuery={filterQuery}
                        skip={isInitializing}
                        sourceId="default"
                        startDate={from}
                      >
                        {({ kpiNetwork, loading, id, inspect, refetch }) => (
                          <KpiNetworkComponentManage
                            id={id}
                            inspect={inspect}
                            setQuery={setQuery}
                            refetch={refetch}
                            data={kpiNetwork}
                            loading={loading}
                            from={from}
                            to={to}
                          />
                        )}
                      </KpiNetworkQuery>

                      <EuiSpacer />

                      <NetworkTopNFlowQuery
                        endDate={to}
                        filterQuery={filterQuery}
                        skip={isInitializing}
                        sourceId="default"
                        startDate={from}
                        type={networkModel.NetworkType.page}
                      >
                        {({
                          totalCount,
                          loading,
                          networkTopNFlow,
                          pageInfo,
                          loadMore,
                          id,
                          inspect,
                          refetch,
                        }) => (
                          <NetworkTopNFlowTableManage
                            data={networkTopNFlow}
                            indexPattern={indexPattern}
                            id={id}
                            inspect={inspect}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            loading={loading}
                            loadMore={loadMore}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                            refetch={refetch}
                            setQuery={setQuery}
                            totalCount={totalCount}
                            type={networkModel.NetworkType.page}
                          />
                        )}
                      </NetworkTopNFlowQuery>

                      <EuiSpacer />

                      <NetworkDnsQuery
                        endDate={to}
                        filterQuery={filterQuery}
                        skip={isInitializing}
                        sourceId="default"
                        startDate={from}
                        type={networkModel.NetworkType.page}
                      >
                        {({
                          totalCount,
                          loading,
                          networkDns,
                          pageInfo,
                          loadMore,
                          id,
                          inspect,
                          refetch,
                        }) => (
                          <NetworkDnsTableManage
                            data={networkDns}
                            id={id}
                            inspect={inspect}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            loading={loading}
                            loadMore={loadMore}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                            refetch={refetch}
                            setQuery={setQuery}
                            totalCount={totalCount}
                            type={networkModel.NetworkType.page}
                          />
                        )}
                      </NetworkDnsQuery>

                      <EuiSpacer />

                      <AnomaliesNetworkTable
                        startDate={from}
                        endDate={to}
                        skip={isInitializing}
                        type={networkModel.NetworkType.page}
                        narrowDateRange={(score, interval) => {
                          const fromTo = scoreIntervalToDateTime(score, interval);
                          setAbsoluteRangeDatePicker({
                            id: 'global',
                            from: fromTo.from,
                            to: fromTo.to,
                          });
                        }}
                      />
                    </>
                  )}
                </UseUrlState>
              )}
            </GlobalTime>
          </StickyContainer>
        ) : (
          <>
            <HeaderPage title={i18n.PAGE_TITLE} />

            <NetworkEmptyPage />
          </>
        )
      }
    </WithSource>
  )
);

const makeMapStateToProps = () => {
  const getNetworkFilterQueryAsJson = networkSelectors.networkFilterQueryAsJson();
  const mapStateToProps = (state: State) => ({
    filterQuery: getNetworkFilterQueryAsJson(state, networkModel.NetworkType.page) || '',
  });
  return mapStateToProps;
};

export const Network = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
  }
)(NetworkComponent);
