/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { FlowTargetSourceDest } from '../../../graphql/types';
import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';

import { IPsQueryTabBody } from './ips_query_tab_body';
import { CountriesQueryTabBody } from './countries_query_tab_body';
import { HttpQueryTabBody } from './http_query_tab_body';
import { AnomaliesQueryTabBody } from '../../../containers/anomalies/anomalies_query_tab_body';
import { AnomaliesNetworkTable } from '../../../components/ml/tables/anomalies_network_table';
import { DnsQueryTabBody } from './dns_query_tab_body';
import { ConditionalFlexGroup } from './conditional_flex_group';
import { NetworkRoutesProps, NetworkRouteType } from './types';
import { TlsQueryTabBody } from './tls_query_tab_body';
import { Anomaly } from '../../../components/ml/types';

export const NetworkRoutes = ({
  networkPagePath,
  type,
  to,
  filterQuery,
  isInitializing,
  from,
  indexPattern,
  setQuery,
  setAbsoluteRangeDatePicker,
}: NetworkRoutesProps) => {
  const narrowDateRange = useCallback(
    (score: Anomaly, interval: string) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      setAbsoluteRangeDatePicker({
        id: 'global',
        from: fromTo.from,
        to: fromTo.to,
      });
    },
    [setAbsoluteRangeDatePicker]
  );
  const updateDateRange = useCallback(
    (min: number, max: number) => {
      setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
    },
    [setAbsoluteRangeDatePicker]
  );

  const networkAnomaliesFilterQuery = {
    bool: {
      should: [
        {
          exists: {
            field: 'source.ip',
          },
        },
        {
          exists: {
            field: 'destination.ip',
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  const commonProps = {
    startDate: from,
    endDate: to,
    skip: isInitializing,
    type,
    narrowDateRange,
    setQuery,
    filterQuery,
  };

  const tabProps = {
    ...commonProps,
    indexPattern,
    updateDateRange,
  };

  const anomaliesProps = {
    ...commonProps,
    anomaliesFilterQuery: networkAnomaliesFilterQuery,
    AnomaliesTableComponent: AnomaliesNetworkTable,
  };

  return (
    <Switch>
      <Route
        path={`${networkPagePath}/:tabName(${NetworkRouteType.dns})`}
        render={() => <DnsQueryTabBody {...tabProps} />}
      />
      <Route
        path={`${networkPagePath}/:tabName(${NetworkRouteType.flows})`}
        render={() => (
          <>
            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <IPsQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.source} />
              </EuiFlexItem>

              <EuiFlexItem>
                <IPsQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.destination} />
              </EuiFlexItem>
            </ConditionalFlexGroup>
            <EuiSpacer />
            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <CountriesQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.source} />
              </EuiFlexItem>

              <EuiFlexItem>
                <CountriesQueryTabBody
                  {...tabProps}
                  flowTarget={FlowTargetSourceDest.destination}
                />
              </EuiFlexItem>
            </ConditionalFlexGroup>
          </>
        )}
      />
      <Route
        path={`${networkPagePath}/:tabName(${NetworkRouteType.http})`}
        render={() => <HttpQueryTabBody {...tabProps} />}
      />
      <Route
        path={`${networkPagePath}/:tabName(${NetworkRouteType.tls})`}
        render={() => <TlsQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.source} />}
      />
      <Route
        path={`${networkPagePath}/:tabName(${NetworkRouteType.anomalies})`}
        render={() => (
          <AnomaliesQueryTabBody
            {...anomaliesProps}
            AnomaliesTableComponent={AnomaliesNetworkTable}
          />
        )}
      />
    </Switch>
  );
};

NetworkRoutes.displayName = 'NetworkRoutes';
