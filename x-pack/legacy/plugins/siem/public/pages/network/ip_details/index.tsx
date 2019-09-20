/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';

import { FiltersGlobal } from '../../../components/filters_global';
import { HeaderPage } from '../../../components/header_page';
import { LastEventTime } from '../../../components/last_event_time';
import { FlowTargetSelectConnected } from '../../../components/page/network/flow_target_select_connected';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../../containers/source';
import { LastEventIndexKey } from '../../../graphql/types';
import { decodeIpv6 } from '../../../lib/helpers';
import { networkModel } from '../../../store';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../store/inputs/actions';
import { SiemNavigation } from '../../../components/navigation';

import { NetworkKql } from '../kql';
import { NetworkEmptyPage } from '../network_empty_page';
import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';
import { SpyRoute } from '../../../utils/route/spy_routes';

import { IpOverview } from '../../../components/page/network/ip_overview';
import { IpOverviewQuery } from '../../../containers/ip_overview';
import { manageQuery } from '../../../components/page/manage_query';
import { AnomalyTableProvider } from '../../../components/ml/anomaly/anomaly_table_provider';
import { networkToCriteria } from '../../../components/ml/criteria/network_to_criteria';

import { DomainsQuery } from '../../../containers/domains';
import { DomainsTable } from '../../../components/page/network/domains_table';

import { navTabsIPDetails } from './nav_tabs';

import { makeMapStateToProps } from './utils';
export { IPDetailsBody } from './body';
import { IPDetailsComponentProps } from './types';
export { getBreadcrumbs } from './utils';

const DomainsTableManage = manageQuery(DomainsTable);
const IpOverviewManage = manageQuery(IpOverview);

export const IPDetailsComponent = pure<IPDetailsComponentProps>(
  ({
    detailName,
    filterQuery,
    flowTarget,
    setAbsoluteRangeDatePicker,
    to,
    from,
    setQuery,
    isInitializing,
  }) => (
    <>
      <WithSource sourceId="default" data-test-subj="ip-details-page">
        {({ indicesExist, indexPattern }) => {
          const ip = decodeIpv6(detailName);

          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
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
              </IpOverviewQuery>

              <EuiHorizontalRule />

              <DomainsQuery
                endDate={to}
                filterQuery={filterQuery}
                flowTarget={flowTarget}
                ip={ip}
                skip={isInitializing}
                sourceId="default"
                startDate={from}
                type={networkModel.NetworkType.details}
              >
                {({
                  id,
                  inspect,
                  isInspected,
                  domains,
                  totalCount,
                  pageInfo,
                  loading,
                  loadPage,
                  refetch,
                }) => (
                  <DomainsTableManage
                    data={domains}
                    indexPattern={indexPattern}
                    id={id}
                    inspect={inspect}
                    flowTarget={flowTarget}
                    fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
                    ip={ip}
                    isInspect={isInspected}
                    loading={loading}
                    loadPage={loadPage}
                    showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
                    refetch={refetch}
                    setQuery={setQuery}
                    totalCount={totalCount}
                    type={networkModel.NetworkType.details}
                  />
                )}
              </DomainsQuery>

              <EuiSpacer />

              <SiemNavigation
                navTabs={navTabsIPDetails(detailName)}
                display="default"
                showBorder={true}
              />

              <EuiSpacer />
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
  )
);

IPDetailsComponent.displayName = 'IPDetailsComponent';

export const IPDetails = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  }
)(IPDetailsComponent);
