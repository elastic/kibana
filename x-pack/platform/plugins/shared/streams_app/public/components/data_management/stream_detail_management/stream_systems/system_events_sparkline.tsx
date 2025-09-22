/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { System } from '@kbn/streams-schema';

import React from 'react';
import { Chart, BarSeries, Settings, Tooltip } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { useStreamSystemEventsData } from './hooks/use_stream_system_events_data';

export const SystemEventsSparkline = ({ system }: { system: System }) => {
  const chartBaseTheme = useElasticChartsTheme();

  const events = useStreamSystemEventsData(system);

  return (
    <Chart size={{ height: 64 }}>
      <Settings baseTheme={chartBaseTheme} showLegend={false} />
      <Tooltip type="none" />
      <BarSeries id="numbers" data={events} xAccessor={0} yAccessors={[1]} />
    </Chart>
  );
};
