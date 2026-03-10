/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchQueryOccurrencesChartData } from '../../../../hooks/use_fetch_queries_occurrences_chart_data';
import { SparkPlot } from '../../../spark_plot';
import { OCCURRENCES_TOOLTIP_NAME } from './translations';

export function QueryOccurrencesSparkPlotCell({ queryId }: { queryId: string }) {
  const { data: queryOccurrencesChartData } = useFetchQueryOccurrencesChartData({ queryId });

  return (
    <SparkPlot
      id={`sparkplot-${queryId}`}
      name={OCCURRENCES_TOOLTIP_NAME}
      type="bar"
      timeseries={queryOccurrencesChartData?.buckets ?? []}
      annotations={[]}
      compressed
      hideAxis
      height={32}
    />
  );
}
