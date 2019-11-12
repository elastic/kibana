/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { ScaleType, niceTimeFormatter, Position } from '@elastic/charts';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { EuiLoadingContent } from '@elastic/eui';
import { get, groupBy, map, toPairs } from 'lodash/fp';
import { AuthMatrixDataFields } from '../page/hosts/authentications_over_time/utils';
import { BarChart } from '../charts/barchart';
import { HeaderPanel } from '../header_panel';
import { ChartSeriesData, UpdateDateRange } from '../charts/common';
import { MatrixOverTimeHistogramData, MatrixOverOrdinalHistogramData } from '../../graphql/types';
import { DEFAULT_DARK_MODE } from '../../../common/constants';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { Loader } from '../loader';
import { Panel } from '../panel';

export interface MatrixHistogramBasicProps<T> {
  data: T[];
  endDate: number;
  id: string;
  loading: boolean;
  mapping?: MatrixHistogramMappingTypes;
  startDate: number;
  totalCount: number;
  updateDateRange: UpdateDateRange;
}

export interface MatrixHistogramProps<T> extends MatrixHistogramBasicProps<T> {
  dataKey?: string;
  scaleType?: ScaleType;
  subtitle?: string;
  title?: string;
}

const getBarchartConfigs = (
  from: number,
  to: number,
  onBrushEnd: UpdateDateRange,
  scaleType: ScaleType
) => ({
  series: {
    xScaleType: scaleType || ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter: scaleType === ScaleType.Time ? niceTimeFormatter([from, to]) : undefined,
    yTickFormatter: (value: string | number): string => value.toLocaleString(),
    tickSize: 8,
  },
  settings: {
    legendPosition: Position.Bottom,
    onBrushEnd,
    showLegend: true,
    theme: {
      scales: {
        barsPadding: 0.08,
      },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
  },
  customHeight: 324,
});

const formatToChartDataItem = ([key, value]: [
  string,
  MatrixHistogramDataTypes[]
]): ChartSeriesData => ({
  key,
  value,
});

const getCustomChartData = (
  data: MatrixHistogramDataTypes[],
  mapping?: MatrixHistogramMappingTypes
): ChartSeriesData[] => {
  const dataGroupedByEvent = groupBy('g', data);
  const dataGroupedEntries = toPairs(dataGroupedByEvent);
  const formattedChartData = map(formatToChartDataItem, dataGroupedEntries);

  if (mapping)
    return formattedChartData.map((item: ChartSeriesData) => {
      const customColor = get(`${item.key}.color`, mapping);
      item.color = customColor;
      return item;
    });
  else return formattedChartData;
};

type MatrixHistogramDataTypes = MatrixOverTimeHistogramData | MatrixOverOrdinalHistogramData;
type MatrixHistogramMappingTypes = AuthMatrixDataFields;

export const MatrixHistogram = ({
  data,
  dataKey,
  endDate,
  id,
  loading,
  mapping,
  scaleType = ScaleType.Time,
  startDate,
  subtitle,
  title,
  totalCount,
  updateDateRange,
}: MatrixHistogramProps<MatrixHistogramDataTypes>) => {
  const barchartConfigs = getBarchartConfigs(startDate!, endDate!, updateDateRange, scaleType);
  const [showInspect, setShowInspect] = useState(false);
  const [darkMode] = useKibanaUiSetting(DEFAULT_DARK_MODE);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const barChartData: ChartSeriesData[] = getCustomChartData(data, mapping);

  useEffect(() => {
    if (totalCount >= 0 && loadingInitial) {
      setLoadingInitial(false);
    }
  }, [loading]);

  return (
    <Panel
      data-test-subj={`${dataKey}Panel`}
      loading={loading}
      onMouseEnter={() => setShowInspect(true)}
      onMouseLeave={() => setShowInspect(false)}
    >
      <HeaderPanel
        id={id}
        title={title}
        showInspect={!loadingInitial && showInspect}
        subtitle={!loadingInitial && subtitle}
      />

      {loadingInitial ? (
        <EuiLoadingContent data-test-subj="initialLoadingPanelMatrixOverTime" lines={10} />
      ) : (
        <>
          <BarChart barChart={barChartData} configs={barchartConfigs} />

          {loading && (
            <Loader
              overlay
              overlayBackground={
                darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
              }
              size="xl"
            />
          )}
        </>
      )}
    </Panel>
  );
};
