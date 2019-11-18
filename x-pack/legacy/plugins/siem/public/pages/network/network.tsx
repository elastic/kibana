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
import { SiemNavigation } from '../../components/navigation';
import { manageQuery } from '../../components/page/manage_query';
import { KpiNetworkComponent } from '../../components/page/network';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { KpiNetworkQuery } from '../../containers/kpi_network';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { useKibanaCore } from '../../lib/compose/kibana_core';
import { convertToBuildEsQuery } from '../../lib/keury';
import { networkModel, State, inputsSelectors } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';
import { navTabsNetwork, NetworkRoutes, NetworkRoutesLoading } from './navigation';
import { NetworkEmptyPage } from './network_empty_page';
import * as i18n from './translations';
import { NetworkComponentProps } from './types';
import { esQuery } from '../../../../../../../src/plugins/data/public';

const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
const sourceId = 'default';

const NetworkComponent = React.memo<NetworkComponentProps>(
  ({
    filters,
    query,
    setAbsoluteRangeDatePicker,
    networkPagePath,
    to,
    from,
    setQuery,
    isInitializing,
    hasMlUserPermissions,
    capabilitiesFetched,
  }) => {
    const core = useKibanaCore();

    return (
      <>
        <WithSource sourceId={sourceId}>
          {({ indicesExist, indexPattern }) => {
            const filterQuery = convertToBuildEsQuery({
              config: esQuery.getEsQueryConfig(core.uiSettings),
              indexPattern,
              queries: [query],
              filters,
            });

            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar indexPattern={indexPattern} id="global" />
                </FiltersGlobal>

                <WrapperPage>
                  <HeaderPage
                    border
                    subtitle={<LastEventTime indexKey={LastEventIndexKey.network} />}
                    title={i18n.PAGE_TITLE}
                  />

                  <EmbeddedMap
                    query={query}
                    filters={filters}
                    startDate={from}
                    endDate={to}
                    setQuery={setQuery}
                  />

                  <EuiSpacer />

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

                  {capabilitiesFetched && !isInitializing ? (
                    <>
                      <EuiSpacer />

                      <SiemNavigation navTabs={navTabsNetwork(hasMlUserPermissions)} />

                      <EuiSpacer />

                      <NetworkRoutes
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
                  ) : (
                    <NetworkRoutesLoading />
                  )}

                  <EuiSpacer />
                </WrapperPage>
              </StickyContainer>
            ) : (
              <WrapperPage>
                <HeaderPage border title={i18n.PAGE_TITLE} />
                <NetworkEmptyPage />
              </WrapperPage>
            );
          }}
        </WithSource>

        <SpyRoute />
      </>
    );
  }
);
NetworkComponent.displayName = 'NetworkComponent';

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const mapStateToProps = (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });
  return mapStateToProps;
};

export const Network = connect(makeMapStateToProps, {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
})(NetworkComponent);
