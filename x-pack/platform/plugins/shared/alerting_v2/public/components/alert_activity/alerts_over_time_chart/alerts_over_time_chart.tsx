/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { useFetchAlertSummary } from '../../../hooks/use_fetch_alert_summary';
import { getDiscoverHrefForRuleEvents } from '../../../utils/discover_href_for_rule_events';
import { AlertsOverTimeChartView } from './alerts_over_time_chart_view';
import type { AlertsOverTimeChartProps } from '../types';

/**
 * Connected alerts-over-time chart. Queries the v2 alert summary endpoint,
 * resolves the Discover link, and delegates rendering to the presentational
 * {@link AlertsOverTimeChartView}.
 */
export const AlertsOverTimeChart = ({
  ruleIds,
  timeRange,
  fixedInterval,
  discoverTimeRange,
  title,
  onBrushEnd,
}: AlertsOverTimeChartProps) => {
  const charts = useService(PluginStart('charts')) as ChartsPluginStart;
  const share = useService(PluginStart('share')) as SharePluginStart;
  const uiSettings = useService(CoreStart('uiSettings'));
  const application = useService(CoreStart('application'));
  const baseTheme = charts.theme.useChartsBaseTheme();

  const { data, isLoading, isError } = useFetchAlertSummary({
    ruleIds,
    gte: timeRange.gte,
    lte: timeRange.lte,
    fixedInterval,
  });

  const discoverHref = useMemo(
    () =>
      getDiscoverHrefForRuleEvents({
        share,
        capabilities: application.capabilities,
        uiSettings,
        ruleIds,
        timeRange: discoverTimeRange,
      }),
    [application.capabilities, discoverTimeRange, ruleIds, share, uiSettings]
  );

  return (
    <AlertsOverTimeChartView
      isLoading={isLoading}
      isError={isError}
      data={data}
      title={title}
      discoverHref={discoverHref}
      baseTheme={baseTheme}
      onBrushEnd={onBrushEnd}
    />
  );
};
