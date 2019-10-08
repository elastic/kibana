/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';
import { EuiFlexItem } from '@elastic/eui';

import { IPsQueryTabBody } from './navigation/ips_query_tab_body';
import { AnomaliesQueryTabBody } from './navigation/anomalies_query_tab_body';
import { DnsQueryTabBody } from './navigation/dns_query_tab_body';
import { FlowTargetNew } from '../../graphql/types';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';

import { ConditionalFlexGroup } from './conditional_flex_group';
import { NetworkTabsProps, NetworkTabType } from './types';

export const NetworkTabs = ({
  networkPagePath,
  type,
  to,
  filterQuery,
  isInitializing,
  from,
  indexPattern,
  setQuery,
  setAbsoluteRangeDatePicker,
}: NetworkTabsProps) => {
  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      setAbsoluteRangeDatePicker({
        id: 'global',
        from: fromTo.from,
        to: fromTo.to,
      });
    },
    [scoreIntervalToDateTime, setAbsoluteRangeDatePicker]
  );

  const tabProps = {
    networkPagePath,
    type,
    to,
    filterQuery,
    isInitializing,
    from,
    indexPattern,
    setQuery,
  };

  const anomaliesProps = {
    from,
    to,
    isInitializing,
    type,
    narrowDateRange,
  };

  return (
    <Switch>
      <Route
        path={`${networkPagePath}/:tabName(${NetworkTabType.dns})`}
        render={() => <DnsQueryTabBody {...tabProps} />}
      />
      <Route
        path={`${networkPagePath}/:tabName(${NetworkTabType.ips})`}
        render={() => (
          <ConditionalFlexGroup direction="column">
            <EuiFlexItem>
              <IPsQueryTabBody {...tabProps} flowTarget={FlowTargetNew.source} />
            </EuiFlexItem>

            <EuiFlexItem>
              <IPsQueryTabBody {...tabProps} flowTarget={FlowTargetNew.destination} />
            </EuiFlexItem>
          </ConditionalFlexGroup>
        )}
      />
      <Route
        path={`${networkPagePath}/:tabName(${NetworkTabType.anomalies})`}
        render={() => <AnomaliesQueryTabBody {...anomaliesProps} />}
      />
    </Switch>
  );
};

NetworkTabs.displayName = 'NetworkTabs';
