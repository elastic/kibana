/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useContext, useEffect, useCallback } from 'react';
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
import { useKibana } from '../../../lib/kibana';
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
    }, [setHostDetailsTablesActivePageToZero, detailName]);
    const capabilities = useContext(MlCapabilitiesContext);
    const kibana = useKibana();
    const hostDetailsPageFilters: esFilters.Filter[] = [
      {
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
      },
    ];
    const getFilters = () => [...hostDetailsPageFilters, ...filters];
    const narrowDateRange = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            const filterQuery = convertToBuildEsQuery({
              config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
              indexPattern,
              queries: [query],
              filters: getFilters(),
            });
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar id="global" indexPattern={indexPattern} />
                </FiltersGlobal>

                <WrapperPage>
                  <HeaderPage
                    subtitle={
                      <LastEventTime
                        hostName={detailName}
                        indexKey={LastEventIndexKey.hostDetails}
                      />
                    }
                    title={detailName}
                    border
                  />

                  <HostOverviewByNameQuery
                    endDate={to}
                    hostName={detailName}
                    skip={isInitializing}
                    sourceId="default"
                    startDate={from}
                  >
                    {({ hostOverview, loading, id, inspect, refetch }) => (
                      <AnomalyTableProvider
                        criteriaFields={hostToCriteria(hostOverview)}
                        endDate={to}
                        skip={isInitializing}
                        startDate={from}
                      >
                        {({ isLoadingAnomaliesData, anomaliesData }) => (
                          <HostOverviewManage
                            anomaliesData={anomaliesData}
                            data={hostOverview}
                            endDate={to}
                            id={id}
                            inspect={inspect}
                            isLoadingAnomaliesData={isLoadingAnomaliesData}
                            loading={loading}
                            narrowDateRange={(score, interval) => {
                              const fromTo = scoreIntervalToDateTime(score, interval);
                              setAbsoluteRangeDatePicker({
                                id: 'global',
                                from: fromTo.from,
                                to: fromTo.to,
                              });
                            }}
                            refetch={refetch}
                            setQuery={setQuery}
                            startDate={from}
                          />
                        )}
                      </AnomalyTableProvider>
                    )}
                  </HostOverviewByNameQuery>

                  <EuiHorizontalRule />

                  <KpiHostDetailsQuery
                    endDate={to}
                    filterQuery={filterQuery}
                    skip={isInitializing}
                    sourceId="default"
                    startDate={from}
                  >
                    {({ kpiHostDetails, id, inspect, loading, refetch }) => (
                      <KpiHostDetailsManage
                        data={kpiHostDetails}
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
                  </KpiHostDetailsQuery>

                  <EuiSpacer />

                  <SiemNavigation
                    navTabs={navTabsHostDetails(detailName, hasMlUserPermissions(capabilities))}
                  />

                  <EuiSpacer />

                  <HostDetailsTabs
                    deleteQuery={deleteQuery}
                    detailName={detailName}
                    filterQuery={filterQuery}
                    from={from}
                    hostDetailsPagePath={hostDetailsPagePath}
                    indexPattern={indexPattern}
                    isInitializing={isInitializing}
                    pageFilters={hostDetailsPageFilters}
                    setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                    setQuery={setQuery}
                    to={to}
                    type={type}
                  />
                </WrapperPage>
              </StickyContainer>
            ) : (
              <WrapperPage>
                <HeaderPage title={detailName} border />

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
