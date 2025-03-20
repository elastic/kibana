/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BarSeries, Chart, Settings } from '@elastic/charts';
import React from 'react';
import { SignificantEventsResponse } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';

interface Props {
  occurrences: SignificantEventsResponse['occurrences'];
}

export function SignificantEventsHistogramChart({ occurrences }: Props) {
  const {
    dependencies: {
      start: { charts },
    },
  } = useKibana();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const sparklineTheme = charts.theme.useSparklineOverrides();

  return (
    <Chart size={{ height: 16, width: 128 }}>
      <Settings baseTheme={baseTheme} showLegend={false} theme={[sparklineTheme]} />
      <BarSeries
        data={occurrences.map((occurrence) => ({
          key: new Date(occurrence.date).getTime(),
          value: occurrence.count,
        }))}
        id="occurrences"
        xAccessor={'key'}
        xScaleType="time"
        yAccessors={['value']}
        yScaleType="linear"
        enableHistogramMode
      />
    </Chart>
  );
}
