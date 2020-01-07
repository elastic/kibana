/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { connect } from 'react-redux';
import { useParams } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';

import { esQuery } from '../../../../../../../src/plugins/data/public';
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
import { useKibana } from '../../lib/kibana';
import { convertToBuildEsQuery } from '../../lib/keury';
import { networkModel, State, inputsSelectors } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';
import { navTabsNetwork, NetworkRoutes, NetworkRoutesLoading } from './navigation';
import { filterAlertsNetwork } from './navigation/alerts_query_tab_body';
import { NetworkEmptyPage } from './network_empty_page';
import * as i18n from './translations';
import { NetworkComponentProps } from './types';
import { NetworkRouteType } from './navigation/types';

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
    const kibana = useKibana();
    const { tabName } = useParams();

    const networkFilters = useMemo(() => {
      if (tabName === NetworkRouteType.alerts) {
        return filters.length > 0 ? [...filters, ...filterAlertsNetwork] : filterAlertsNetwork;
      }
      return filters;
    }, [tabName]);
    const narrowDateRange = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    return (
      <>
        <WithSource sourceId={sourceId}>
          {({ indicesExist, indexPattern }) => {
            const filterQuery = convertToBuildEsQuery({
              config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
              indexPattern,
              queries: [query],
              filters: networkFilters,
            });

            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar id="global" indexPattern={indexPattern} />
                </FiltersGlobal>

                <WrapperPage>
                  <HeaderPage
                    subtitle={<LastEventTime indexKey={LastEventIndexKey.network} />}
                    title={i18n.PAGE_TITLE}
                    border
                  />

                  <EmbeddedMap
                    endDate={to}
                    filters={filters}
                    query={query}
                    setQuery={setQuery}
                    startDate={from}
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
                        data={kpiNetwork}
                        from={from}
                        id={id}
                        inspect={inspect}
                        loading={loading}
                        narrowDateRange={narrowDateRange}
                        refetch={refetch}
                        setQuery={setQuery}
                        to={to}
                      />
                    )}
                  </KpiNetworkQuery>

                  {capabilitiesFetched && !isInitializing ? (
                    <>
                      <EuiSpacer />

                      <SiemNavigation navTabs={navTabsNetwork(hasMlUserPermissions)} />

                      <EuiSpacer />

                      <NetworkRoutes
                        filterQuery={filterQuery}
                        from={from}
                        indexPattern={indexPattern}
                        isInitializing={isInitializing}
                        networkPagePath={networkPagePath}
                        setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                        setQuery={setQuery}
                        to={to}
                        type={networkModel.NetworkType.page}
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
                <HeaderPage title={i18n.PAGE_TITLE} border />
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
