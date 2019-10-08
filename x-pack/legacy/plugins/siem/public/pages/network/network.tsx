/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';

import { EmbeddedMap } from '../../components/embeddables/embedded_map';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { manageQuery } from '../../components/page/manage_query';
import { KpiNetworkComponent } from '../../components/page/network';
import { KpiNetworkQuery } from '../../containers/kpi_network';
import { NetworkFilter } from '../../containers/network';
import { SiemNavigation } from '../../components/navigation';

import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { networkModel, networkSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';
import { NetworkKql } from './kql';
import { NetworkEmptyPage } from './network_empty_page';
import * as i18n from './translations';

import { navTabsNetwork } from './nav_tabs';
import { NetworkComponentProps } from './types';

import { NetworkTabs } from './network_tabs';
import { NetworkTabsLoading } from './network_tabs_loading';

const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
const sourceId = 'default';

const NetworkComponent = React.memo<NetworkComponentProps>(
  ({
    filterQuery,
    queryExpression,
    setAbsoluteRangeDatePicker,
    networkPagePath,
    to,
    from,
    setQuery,
    isInitializing,
    hasMlUserPermissions,
  }) => (
    <>
      <WithSource sourceId={sourceId}>
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <>
              <StickyContainer>
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

                  <NetworkFilter indexPattern={indexPattern} type={networkModel.NetworkType.page}>
                    {({ applyFilterQueryFromKueryExpression }) => (
                      <EmbeddedMap
                        applyFilterQueryFromKueryExpression={applyFilterQueryFromKueryExpression}
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
                    sourceId={sourceId}
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

                  {isInitializing ? (
                    <NetworkTabsLoading />
                  ) : (
                    <>
                      <EuiSpacer />

                      <SiemNavigation
                        navTabs={navTabsNetwork(hasMlUserPermissions)}
                        display={sourceId}
                        showBorder={true}
                      />

                      <EuiSpacer />

                      <NetworkTabs
                        to={to}
                        filterQuery={filterQuery}
                        isInitializing={isInitializing}
                        from={from}
                        type={networkModel.NetworkType.page}
                        indexPattern={indexPattern}
                        setQuery={setQuery}
                        setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                        networkPagePath={networkPagePath}
                      />
                    </>
                  )}

                  <EuiSpacer />
                </>
              </StickyContainer>
            </>
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
  )
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
