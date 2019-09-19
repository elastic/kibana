/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FlexGroupDirection } from '@elastic/eui/src/components/flex/flex_group';
import { getOr } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';
import { ActionCreator } from 'typescript-fsa';

import { EmbeddedMap } from '../../components/embeddables/embedded_map';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { AnomaliesNetworkTable } from '../../components/ml/tables/anomalies_network_table';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { manageQuery } from '../../components/page/manage_query';
import { KpiNetworkComponent, NetworkTopNFlowTable } from '../../components/page/network';
import { NetworkDnsTable } from '../../components/page/network/network_dns_table';
import { GlobalTime } from '../../containers/global_time';
import { KpiNetworkQuery } from '../../containers/kpi_network';
import { NetworkFilter } from '../../containers/network';
import { NetworkDnsQuery } from '../../containers/network_dns';
import { NetworkTopNFlowQuery } from '../../containers/network_top_n_flow';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { FlowTargetNew, LastEventIndexKey } from '../../graphql/types';
import { networkModel, networkSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { SpyRoute } from '../../utils/route/spy_routes';
import { NetworkKql } from './kql';
import { NetworkEmptyPage } from './network_empty_page';
import * as i18n from './translations';

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);
const NetworkDnsTableManage = manageQuery(NetworkDnsTable);
const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
interface NetworkComponentReduxProps {
  filterQuery: string;
  queryExpression: string;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type NetworkComponentProps = NetworkComponentReduxProps & Partial<RouteComponentProps<{}>>;

const NetworkComponent = React.memo<NetworkComponentProps>(
  ({ filterQuery, queryExpression, setAbsoluteRangeDatePicker }) => {
    const [flexDirection, setFlexDirection] = useState<FlexGroupDirection>('column');

    const wideViewports = window.matchMedia('screen and (min-width: 1441px)');

    const onWidthChange = (mq: MediaQueryList) => {
      setFlexDirection(mq.matches ? 'row' : 'column');
    };

    useEffect(() => {
      wideViewports.addEventListener('change', () => {
        onWidthChange(wideViewports);
      });
      onWidthChange(wideViewports);

      return () => {
        wideViewports.removeEventListener('change', () => {
          onWidthChange(wideViewports);
        });
      };
    }, []);

    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) =>
            indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <GlobalTime>
                  {({ to, from, setQuery, isInitializing }) => (
                    <>
                      <FiltersGlobal>
                        <NetworkKql
                          indexPattern={indexPattern}
                          setQuery={setQuery}
                          type={networkModel.NetworkType.page}
                        />
                      </FiltersGlobal>

                      <HeaderPage
                        subtitle={<LastEventTime indexKey={LastEventIndexKey.network} />}
                        title={i18n.PAGE_TITLE}
                      />

                      <NetworkFilter
                        indexPattern={indexPattern}
                        type={networkModel.NetworkType.page}
                      >
                        {({ applyFilterQueryFromKueryExpression }) => (
                          <EmbeddedMap
                            applyFilterQueryFromKueryExpression={
                              applyFilterQueryFromKueryExpression
                            }
                            queryExpression={queryExpression}
                            startDate={from}
                            endDate={to}
                            setQuery={setQuery}
                          />
                        )}
                      </NetworkFilter>

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
                            narrowDateRange={(min: number, max: number) => {
                              setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
                            }}
                          />
                        )}
                      </KpiNetworkQuery>

                      <EuiSpacer />

                      <EuiFlexGroup direction={flexDirection}>
                        <EuiFlexItem>
                          <NetworkTopNFlowQuery
                            endDate={to}
                            flowTarget={FlowTargetNew.source}
                            filterQuery={filterQuery}
                            skip={isInitializing}
                            sourceId="default"
                            startDate={from}
                            type={networkModel.NetworkType.page}
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
                                flowTargeted={FlowTargetNew.source}
                                id={id}
                                indexPattern={indexPattern}
                                inspect={inspect}
                                isInspect={isInspected}
                                loading={loading}
                                loadPage={loadPage}
                                refetch={refetch}
                                setQuery={setQuery}
                                showMorePagesIndicator={getOr(
                                  false,
                                  'showMorePagesIndicator',
                                  pageInfo
                                )}
                                totalCount={totalCount}
                                type={networkModel.NetworkType.page}
                              />
                            )}
                          </NetworkTopNFlowQuery>
                        </EuiFlexItem>

                        <EuiFlexItem>
                          <NetworkTopNFlowQuery
                            endDate={to}
                            flowTarget={FlowTargetNew.destination}
                            filterQuery={filterQuery}
                            skip={isInitializing}
                            sourceId="default"
                            startDate={from}
                            type={networkModel.NetworkType.page}
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
                                flowTargeted={FlowTargetNew.destination}
                                id={id}
                                indexPattern={indexPattern}
                                inspect={inspect}
                                isInspect={isInspected}
                                loading={loading}
                                loadPage={loadPage}
                                refetch={refetch}
                                setQuery={setQuery}
                                showMorePagesIndicator={getOr(
                                  false,
                                  'showMorePagesIndicator',
                                  pageInfo
                                )}
                                totalCount={totalCount}
                                type={networkModel.NetworkType.page}
                              />
                            )}
                          </NetworkTopNFlowQuery>
                        </EuiFlexItem>
                      </EuiFlexGroup>

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
                          loadPage,
                          id,
                          inspect,
                          isInspected,
                          refetch,
                        }) => (
                          <NetworkDnsTableManage
                            data={networkDns}
                            fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                            id={id}
                            inspect={inspect}
                            isInspect={isInspected}
                            loading={loading}
                            loadPage={loadPage}
                            refetch={refetch}
                            setQuery={setQuery}
                            showMorePagesIndicator={getOr(
                              false,
                              'showMorePagesIndicator',
                              pageInfo
                            )}
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
        <SpyRoute />
      </>
    );
  }
);

NetworkComponent.displayName = 'NetworkComponent';

const makeMapStateToProps = () => {
  const getNetworkFilterQueryAsJson = networkSelectors.networkFilterQueryAsJson();
  const getNetworkFilterExpression = networkSelectors.networkFilterExpression();
  const mapStateToProps = (state: State) => ({
    filterQuery: getNetworkFilterQueryAsJson(state, networkModel.NetworkType.page) || '',
    queryExpression: getNetworkFilterExpression(state, networkModel.NetworkType.page) || '',
  });
  return mapStateToProps;
};

export const Network = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
  }
)(NetworkComponent);
