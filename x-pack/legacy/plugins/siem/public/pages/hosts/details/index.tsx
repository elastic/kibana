/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useContext, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../../components/filters_global';
import { HeaderPage } from '../../../components/header_page';
import { KpiHostDetailsQuery } from '../../../containers/kpi_host_details';
import { LastEventTime } from '../../../components/last_event_time';
import { hostToCriteria } from '../../../components/ml/criteria/host_to_criteria';
import { MlCapabilitiesContext } from '../../../components/ml/permissions/ml_capabilities_provider';
import { hasMlUserPermissions } from '../../../components/ml/permissions/has_ml_user_permissions';
import { AnomalyTableProvider } from '../../../components/ml/anomaly/anomaly_table_provider';
import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';
import { setHostDetailsTablesActivePageToZero as dispatchHostDetailsTablesActivePageToZero } from '../../../store/hosts/actions';
import { SiemNavigation } from '../../../components/navigation';
import { manageQuery } from '../../../components/page/manage_query';
import { HostOverview } from '../../../components/page/hosts/host_overview';
import { KpiHostsComponent } from '../../../components/page/hosts';
import { SiemSearchBar } from '../../../components/search_bar';
import { HostOverviewByNameQuery } from '../../../containers/hosts/overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../../containers/source';
import { LastEventIndexKey } from '../../../graphql/types';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../store/inputs/actions';
import { SpyRoute } from '../../../utils/route/spy_routes';

import { HostsQueryProps } from '../hosts';
import { HostsEmptyPage } from '../hosts_empty_page';

export { HostDetailsBody } from './body';
import { navTabsHostDetails } from './nav_tabs';
import { HostDetailsComponentProps } from './types';
import { makeMapStateToProps } from './utils';

const HostOverviewManage = manageQuery(HostOverview);
const KpiHostDetailsManage = manageQuery(KpiHostsComponent);

const HostDetailsComponent = React.memo<HostDetailsComponentProps>(
  ({
    detailName,
    filters,
    from,
    isInitializing,
    query,
    setAbsoluteRangeDatePicker,
    setHostDetailsTablesActivePageToZero,
    setQuery,
    to,
  }) => {
    useEffect(() => {
      setHostDetailsTablesActivePageToZero(null);
    }, [detailName]);
    const capabilities = useContext(MlCapabilitiesContext);
    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            const filterQuery = convertToBuildEsQuery({
              indexPattern,
              queries: [query],
              filters: [
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
                ...filters,
              ],
            });
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar indexPattern={indexPattern} id="global" />
                </FiltersGlobal>

                <HeaderPage
                  subtitle={
                    <LastEventTime indexKey={LastEventIndexKey.hostDetails} hostName={detailName} />
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

                <SiemNavigation
                  navTabs={navTabsHostDetails(detailName, hasMlUserPermissions(capabilities))}
                  display="default"
                  showBorder={true}
                />
                <EuiSpacer />
              </StickyContainer>
            ) : (
              <>
                <HeaderPage title={detailName} />

                <HostsEmptyPage />
              </>
            );
          }}
        </WithSource>
        <SpyRoute />
      </>
    );
  }
);

HostDetailsComponent.displayName = 'HostDetailsComponent';

export const HostDetails = compose<React.ComponentClass<HostsQueryProps & { detailName: string }>>(
  connect(
    makeMapStateToProps,
    {
      setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
      setHostDetailsTablesActivePageToZero: dispatchHostDetailsTablesActivePageToZero,
    }
  )
)(HostDetailsComponent);
