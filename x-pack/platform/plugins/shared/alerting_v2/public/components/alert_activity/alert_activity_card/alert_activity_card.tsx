/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { useFetchAlertSummary } from '../../../hooks/use_fetch_alert_summary';
import { AlertActivityCardView } from './alert_activity_card_view';
import type { AlertActivityCardProps } from '../types';

/**
 * Connected "Alert activity" card. Queries the v2 alert summary endpoint and
 * delegates rendering to the presentational {@link AlertActivityCardView}.
 */
export const AlertActivityCard = ({
  ruleIds,
  timeRange,
  fixedInterval,
  lookbackLabel,
}: AlertActivityCardProps) => {
  const charts = useService(PluginStart('charts')) as ChartsPluginStart;
  const baseTheme = charts.theme.useChartsBaseTheme();

  const { data, isLoading, isError } = useFetchAlertSummary({
    ruleIds,
    gte: timeRange.gte,
    lte: timeRange.lte,
    fixedInterval,
  });

  return (
    <AlertActivityCardView
      isLoading={isLoading}
      isError={isError}
      data={data}
      lookbackLabel={lookbackLabel}
      baseTheme={baseTheme}
    />
  );
};
