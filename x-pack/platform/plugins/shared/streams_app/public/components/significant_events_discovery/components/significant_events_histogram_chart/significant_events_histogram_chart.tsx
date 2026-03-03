/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { TickFormatter } from '@elastic/charts';
import { type SparkPlotAnnotation, SparkPlot } from '../../../spark_plot';
import type { FormattedChangePoint } from '../../utils/change_point';
import { getAnnotationFromFormattedChangePoint } from '../../utils/get_annotation_from_formatted_change_point';

interface Props {
  id: string;
  occurrences: Array<{ x: number; y: number }>;
  changes: FormattedChangePoint[];
  xFormatter: TickFormatter;
  height?: number;
  compressed?: boolean;
  maxYValue?: number;
}

export function SignificantEventsHistogramChart({
  id,
  occurrences,
  changes,
  xFormatter,
  compressed = true,
  height,
  maxYValue,
}: Props) {
  const theme = useEuiTheme().euiTheme;

  const annotations = useMemo((): SparkPlotAnnotation[] => {
    if (!changes.length) {
      return [];
    }

    return Object.entries(groupBy(changes, 'time')).map(([time, groupedByTimestamp]) =>
      getAnnotationFromFormattedChangePoint({
        time: Number(time),
        changes: groupedByTimestamp,
        theme,
        xFormatter,
      })
    );
  }, [changes, theme, xFormatter]);

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
      compressed={compressed}
      height={height}
      maxYValue={maxYValue}
    />
  );
}
