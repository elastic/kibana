/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useContext, useEffect } from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { compose } from 'redux';

import { FiltersGlobal } from '../../../components/filters_global';
import { HeaderPage } from '../../../components/header_page';
import { LastEventTime } from '../../../components/last_event_time';
import { AnomalyTableProvider } from '../../../components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../components/ml/criteria/host_to_criteria';
import { hasMlUserPermissions } from '../../../components/ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../../components/ml/permissions/ml_capabilities_provider';
import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';
import { SiemNavigation } from '../../../components/navigation';
import { KpiHostsComponent } from '../../../components/page/hosts';
import { HostOverview } from '../../../components/page/hosts/host_overview';
import { manageQuery } from '../../../components/page/manage_query';
import { SiemSearchBar } from '../../../components/search_bar';
import { WrapperPage } from '../../../components/wrapper_page';
import { HostOverviewByNameQuery } from '../../../containers/hosts/overview';
import { KpiHostDetailsQuery } from '../../../containers/kpi_host_details';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../../containers/source';
import { LastEventIndexKey } from '../../../graphql/types';
import { useKibanaCore } from '../../../lib/compose/kibana_core';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { inputsSelectors, State } from '../../../store';
import { setHostDetailsTablesActivePageToZero as dispatchHostDetailsTablesActivePageToZero } from '../../../store/hosts/actions';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../store/inputs/actions';
import { SpyRoute } from '../../../utils/route/spy_routes';
import { esQuery, esFilters } from '../../../../../../../../src/plugins/data/public';

import { HostsEmptyPage } from '../hosts_empty_page';
import { HostDetailsTabs } from './details_tabs';
import { navTabsHostDetails } from './nav_tabs';
import { HostDetailsComponentProps, HostDetailsProps } from './types';
import { type } from './utils';

const HostOverviewManage = manageQuery(HostOverview);
const KpiHostDetailsManage = manageQuery(KpiHostsComponent);

const HostDetailsComponent = React.memo<HostDetailsComponentProps>(
  ({
    filters,
    from,
    isInitializing,
    query,
    setAbsoluteRangeDatePicker,
    setHostDetailsTablesActivePageToZero,
    setQuery,
    to,
    detailName,
    deleteQuery,
    hostDetailsPagePath,
  }) => {
    useEffect(() => {
      setHostDetailsTablesActivePageToZero(null);
    }, [detailName]);
    const capabilities = useContext(MlCapabilitiesContext);
    const core = useKibanaCore();

    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            const defaultFilters: esFilters.Filter = {
              meta: {
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'host.name',
                value: detailName,
                params: {
                  query: detailName,
                },
              },
              query: {
                match: {
                  'host.name': {
                    query: detailName,
                    type: 'phrase',
                  },
                },
              },
            };
            const filterQuery = convertToBuildEsQuery({
              config: esQuery.getEsQueryConfig(core.uiSettings),
              indexPattern,
              queries: [query],
              filters: [defaultFilters, ...filters],
            });

            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar indexPattern={indexPattern} id="global" />
                </FiltersGlobal>

                <WrapperPage>
                  <HeaderPage
                    border
                    subtitle={
                      <LastEventTime
                        indexKey={LastEventIndexKey.hostDetails}
                        hostName={detailName}
                      />
                    }
                    title={detailName}
                  />

                  <HostOverviewByNameQuery
                    sourceId="default"
                    hostName={detailName}
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
                    filterQuery={filterQuery}
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
                          setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
                        }}
                      />
                    )}
                  </KpiHostDetailsQuery>

                  <EuiSpacer />

                  <SiemNavigation
                    navTabs={navTabsHostDetails(detailName, hasMlUserPermissions(capabilities))}
                  />

                  <EuiSpacer />

                  <HostDetailsTabs
                    isInitializing={isInitializing}
                    deleteQuery={deleteQuery}
                    defaultFilters={[defaultFilters]}
                    to={to}
                    from={from}
                    detailName={detailName}
                    type={type}
                    setQuery={setQuery}
                    filterQuery={filterQuery}
                    hostDetailsPagePath={hostDetailsPagePath}
                    indexPattern={indexPattern}
                    setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                  />
                </WrapperPage>
              </StickyContainer>
            ) : (
              <WrapperPage>
                <HeaderPage border title={detailName} />

                <HostsEmptyPage />
              </WrapperPage>
            );
          }}
        </WithSource>

        <SpyRoute />
      </>
    );
  }
);
HostDetailsComponent.displayName = 'HostDetailsComponent';

export const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  return (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });
};

export const HostDetails = compose<React.ComponentClass<HostDetailsProps>>(
  connect(makeMapStateToProps, {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
    setHostDetailsTablesActivePageToZero: dispatchHostDetailsTablesActivePageToZero,
  })
)(HostDetailsComponent);
