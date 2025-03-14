/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BarSeries,
  Chart,
  LineAnnotation,
  LineAnnotationStyle,
  PartialTheme,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import { EuiDataGridColumn } from '@elastic/eui';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { RecursivePartial } from '@kbn/utility-types';
import React from 'react';
import { LogCategory, LogCategoryHistogramBucket } from '../../types';

export const logCategoriesGridHistoryColumn = {
  id: 'history' as const,
  display: i18n.translate(
    'xpack.observabilityLogsOverview.logCategoriesGrid.histogramColumnLabel',
    {
      defaultMessage: 'Timeline',
    }
  ),
  isSortable: false,
  initialWidth: 250,
  isExpandable: false,
} satisfies EuiDataGridColumn;

export interface LogCategoriesGridHistogramCellProps {
  dependencies: LogCategoriesGridHistogramCellDependencies;
  logCategory: LogCategory;
}

export interface LogCategoriesGridHistogramCellDependencies {
  charts: ChartsPluginStart;
}

export const LogCategoriesGridHistogramCell: React.FC<LogCategoriesGridHistogramCellProps> = ({
  dependencies: { charts },
  logCategory,
}) => {
  const baseTheme = charts.theme.useChartsBaseTheme();
  const sparklineTheme = charts.theme.useSparklineOverrides();

  return (
    <Chart>
      <Tooltip type={TooltipType.None} />
      <Settings
        baseTheme={baseTheme}
        showLegend={false}
        theme={[sparklineTheme, localThemeOverrides]}
      />
      <BarSeries
        data={logCategory.histogram}
        id="documentCount"
        xAccessor={timestampAccessor}
        xScaleType="time"
        yAccessors={['documentCount']}
        yScaleType="linear"
        enableHistogramMode
      />
      {'timestamp' in logCategory.change && logCategory.change.timestamp != null ? (
        <LineAnnotation
          id="change"
          dataValues={[{ dataValue: new Date(logCategory.change.timestamp).getTime() }]}
          domainType="xDomain"
          style={annotationStyle}
        />
      ) : null}
    </Chart>
  );
};

const localThemeOverrides: PartialTheme = {
  scales: {
    histogramPadding: 0.1,
  },
  background: {
    color: 'transparent',
  },
};

const annotationStyle: RecursivePartial<LineAnnotationStyle> = {
  line: {
    strokeWidth: 2,
  },
};

const timestampAccessor = (histogram: LogCategoryHistogramBucket) =>
  new Date(histogram.timestamp).getTime();
