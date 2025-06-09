/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { TickFormatter } from '@elastic/charts';
import { SparkPlot, SparkPlotAnnotation } from '../spark_plot';
import { FormattedChangePoint } from './change_point';
import { getAnnotationFromFormattedChangePoint } from './utils/get_annotation_from_formatted_change_point';

interface Props {
  id: string;
  occurrences: Array<{ x: number; y: number }>;
  change?: FormattedChangePoint;
  xFormatter: TickFormatter;
}

export function SignificantEventsHistogramChart({ id, occurrences, change, xFormatter }: Props) {
  const theme = useEuiTheme().euiTheme;

  const annotations = useMemo((): SparkPlotAnnotation[] => {
    if (!change) {
      return [];
    }
    return [
      getAnnotationFromFormattedChangePoint({
        query: { id },
        change,
        theme,
        xFormatter,
      }),
    ];
  }, [change, id, theme, xFormatter]);

  return (
    <SparkPlot
      id={id}
      name={i18n.translate('xpack.streams.significantEventsTable.histogramSeriesTitle', {
        defaultMessage: 'Count',
      })}
      timeseries={occurrences}
      type="bar"
      annotations={annotations}
      xFormatter={xFormatter}
    />
  );
}
