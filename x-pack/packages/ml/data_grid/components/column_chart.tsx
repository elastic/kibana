/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { css } from '@emotion/react';

import { BarSeries, Chart, Settings, ScaleType } from '@elastic/charts';
import { euiTextTruncate, type EuiDataGridColumn } from '@elastic/eui';

import { euiThemeVars } from '@kbn/ui-theme';

import { isUnsupportedChartData, ChartData } from '../lib/field_histograms';

import { useColumnChart } from '../hooks/use_column_chart';

const cssHistogram = css({
  width: '100%',
  height: `calc(${euiThemeVars.euiSizeXL} + ${euiThemeVars.euiSizeXXL})`,
});

const cssHistogramLegend = css([
  css`
    ${euiTextTruncate()}
  `,
  {
    color: euiThemeVars.euiColorMediumShade,
    display: 'block',
    overflowX: 'hidden',
    margin: `${euiThemeVars.euiSizeXS} 0 0 0`,
    fontSize: euiThemeVars.euiFontSizeXS,
    fontStyle: 'italic',
    fontWeight: 'normal',
    textAlign: 'left',
  },
]);

const cssHistogramLegendNumeric = css([cssHistogramLegend, { textAlign: 'right' }]);

interface Props {
  chartData: ChartData;
  columnType: EuiDataGridColumn;
  dataTestSubj: string;
  hideLabel?: boolean;
  maxChartColumns?: number;
}

const columnChartTheme = {
  background: { color: 'transparent' },
  chartMargins: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 1,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scales: { barsPadding: 0.1 },
};

export const ColumnChart: FC<Props> = ({
  chartData,
  columnType,
  dataTestSubj,
  hideLabel,
  maxChartColumns,
}) => {
  const { data, legendText } = useColumnChart(chartData, columnType, maxChartColumns);

  return (
    <div data-test-subj={dataTestSubj}>
      {!isUnsupportedChartData(chartData) && data.length > 0 && (
        <div css={cssHistogram} data-test-subj={`${dataTestSubj}-histogram`}>
          <Chart>
            <Settings
              // TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
              theme={columnChartTheme}
            />
            <BarSeries
              id="histogram"
              name="count"
              xScaleType={ScaleType.Ordinal}
              yScaleType={ScaleType.Linear}
              xAccessor={'key_as_string'}
              yAccessors={['doc_count']}
              styleAccessor={(d) => d.datum.color}
              data={data}
            />
          </Chart>
        </div>
      )}
      <div
        css={columnType.schema === 'number' ? cssHistogramLegendNumeric : cssHistogramLegend}
        data-test-subj={`${dataTestSubj}-legend`}
      >
        {legendText}
      </div>
      {!hideLabel && <div data-test-subj={`${dataTestSubj}-id`}>{columnType.id}</div>}
    </div>
  );
};
