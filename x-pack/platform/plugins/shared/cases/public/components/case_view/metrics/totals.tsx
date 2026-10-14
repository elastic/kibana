/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CaseMetricsFeature } from '../../../../common/types/api';
import type { SingleCaseMetrics, SingleCaseMetricsFeature } from '../../../../common/ui';
import {
  ASSOCIATED_HOSTS_METRIC,
  ASSOCIATED_USERS_METRIC,
  TOTAL_ALERTS_METRIC,
  TOTAL_CONNECTORS_METRIC,
} from './translations';

export const CaseViewMetricItems = React.memo(
  ({ metrics, features }: { metrics: SingleCaseMetrics; features: SingleCaseMetricsFeature[] }) => {
    const metricItems = useGetTitleValueMetricItems(metrics, features);
    const { euiTheme } = useEuiTheme();

    return (
      <>
        {metricItems.map(({ id, title, value }) => (
          <EuiFlexItem key={title} data-test-subj={`case-metrics-totals-${id}`}>
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <EuiFlexItem>{title}</EuiFlexItem>
              <EuiFlexItem
                css={css`
                  font-size: ${euiTheme.size.l};
                  font-weight: bold;
                `}
              >
                {value}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </>
    );
  }
);
CaseViewMetricItems.displayName = 'CaseViewMetricItems';

interface MetricItem {
  id: string;
  title: string;
  value: number;
}
type MetricItems = MetricItem[];

const useGetTitleValueMetricItems = (
  metrics: SingleCaseMetrics | null,
  features: SingleCaseMetricsFeature[]
): MetricItems => {
  const { alerts, connectors } = metrics ?? {};
  const totalConnectors = connectors?.total ?? 0;
  const alertsCount = alerts?.count ?? 0;
  const totalAlertUsers = alerts?.users?.total ?? 0;
  const totalAlertHosts = alerts?.hosts?.total ?? 0;

  const metricItems = useMemo<MetricItems>(() => {
    const items: Array<[SingleCaseMetricsFeature, Omit<MetricItem, 'id'>]> = [
      [CaseMetricsFeature.ALERTS_COUNT, { title: TOTAL_ALERTS_METRIC, value: alertsCount }],
      [CaseMetricsFeature.ALERTS_USERS, { title: ASSOCIATED_USERS_METRIC, value: totalAlertUsers }],
      [CaseMetricsFeature.ALERTS_HOSTS, { title: ASSOCIATED_HOSTS_METRIC, value: totalAlertHosts }],
      [CaseMetricsFeature.CONNECTORS, { title: TOTAL_CONNECTORS_METRIC, value: totalConnectors }],
    ];

    return items.reduce(
      (result: MetricItems, [feature, item]) => [
        ...result,
        ...(features.includes(feature) ? [{ id: feature, ...item }] : []),
      ],
      []
    );
  }, [features, alertsCount, totalAlertUsers, totalAlertHosts, totalConnectors]);

  return metricItems;
};
