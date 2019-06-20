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

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { manageQuery } from '../../components/page/manage_query';
import { KpiNetworkComponent, NetworkTopNFlowTable } from '../../components/page/network';
import { NetworkDnsTable } from '../../components/page/network/network_dns_table';
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

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);
const NetworkDnsTableManage = manageQuery(NetworkDnsTable);
const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
interface NetworkComponentReduxProps {
  filterQuery: string;
}

type NetworkComponentProps = NetworkComponentReduxProps;
const NetworkComponent = pure<NetworkComponentProps>(({ filterQuery }) => (
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
              <>
                <KpiNetworkQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                >
                  {({ kpiNetwork, loading, id, refetch }) => (
                    <KpiNetworkComponentManage
                      id={id}
                      setQuery={setQuery}
                      refetch={refetch}
                      data={kpiNetwork}
                      loading={loading}
                    />
                  )}
                </KpiNetworkQuery>

                <EuiSpacer />

                <NetworkTopNFlowQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={networkModel.NetworkType.page}
                >
                  {({ totalCount, loading, networkTopNFlow, pageInfo, loadMore, id, refetch }) => (
                    <NetworkTopNFlowTableManage
                      data={networkTopNFlow}
                      indexPattern={indexPattern}
                      id={id}
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
                  sourceId="default"
                  startDate={from}
                  type={networkModel.NetworkType.page}
                >
                  {({ totalCount, loading, networkDns, pageInfo, loadMore, id, refetch }) => (
                    <NetworkDnsTableManage
                      data={networkDns}
                      id={id}
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
              </>
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
));

const makeMapStateToProps = () => {
  const getNetworkFilterQueryAsJson = networkSelectors.networkFilterQueryAsJson();
  const mapStateToProps = (state: State) => ({
    filterQuery: getNetworkFilterQueryAsJson(state, networkModel.NetworkType.page) || '',
  });
  return mapStateToProps;
};

export const Network = connect(makeMapStateToProps)(NetworkComponent);
