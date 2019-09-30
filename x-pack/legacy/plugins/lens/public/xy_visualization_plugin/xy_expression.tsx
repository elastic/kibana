/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import chrome from 'ui/chrome';
import {
  Chart,
  Settings,
  Axis,
  LineSeries,
  getAxisId,
  getSpecId,
  AreaSeries,
  BarSeries,
  Position,
} from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { FormatFactory } from '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities';
import { IInterpreterRenderFunction } from '../../../../../../src/legacy/core_plugins/expressions/public';
import { LensMultiTable } from '../types';
import { XYArgs, SeriesType, visualizationTypes } from './types';
import { VisualizationContainer } from '../visualization_container';

const IS_DARK_THEME = chrome.getUiSettingsClient().get('theme:darkMode');
const chartTheme = IS_DARK_THEME ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme;

export interface XYChartProps {
  data: LensMultiTable;
  args: XYArgs;
}

export interface XYRender {
  type: 'render';
  as: 'lens_xy_chart_renderer';
  value: XYChartProps;
}

export interface XYChartProps {
  data: LensMultiTable;
  args: XYArgs;
}

type XYChartRenderProps = XYChartProps & {
  formatFactory: FormatFactory;
  timeZone: string;
};

export const xyChart: ExpressionFunction<'lens_xy_chart', LensMultiTable, XYArgs, XYRender> = ({
  name: 'lens_xy_chart',
  type: 'render',
  help: i18n.translate('xpack.lens.xyChart.help', {
    defaultMessage: 'An X/Y chart',
  }),
  args: {
    xTitle: {
      types: ['string'],
      help: 'X axis title',
    },
    yTitle: {
      types: ['string'],
      help: 'Y axis title',
    },
    legend: {
      types: ['lens_xy_legendConfig'],
      help: i18n.translate('xpack.lens.xyChart.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
    layers: {
      types: ['lens_xy_layer'],
      help: 'Layers of visual series',
      multi: true,
    },
    isHorizontal: {
      types: ['boolean'],
      help: 'Render horizontally',
    },
  },
  context: {
    types: ['lens_multitable'],
  },
  fn(data: LensMultiTable, args: XYArgs) {
    return {
      type: 'render',
      as: 'lens_xy_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
  // TODO the typings currently don't support custom type args. As soon as they do, this can be removed
} as unknown) as ExpressionFunction<'lens_xy_chart', LensMultiTable, XYArgs, XYRender>;

export const getXyChartRenderer = (dependencies: {
  formatFactory: FormatFactory;
  timeZone: string;
}): IInterpreterRenderFunction<XYChartProps> => ({
  name: 'lens_xy_chart_renderer',
  displayName: 'XY Chart',
  help: i18n.translate('xpack.lens.xyChart.renderer.help', {
    defaultMessage: 'X/Y Chart Renderer',
  }),
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: XYChartProps, _handlers: unknown) => {
    ReactDOM.render(
      <I18nProvider>
        <XYChartReportable {...config} {...dependencies} />
      </I18nProvider>,
      domNode
    );
  },
});

function getIconForSeriesType(seriesType: SeriesType): IconType {
  return visualizationTypes.find(c => c.id === seriesType)!.icon || 'empty';
}

const MemoizedChart = React.memo(XYChart);

export function XYChartReportable(props: XYChartRenderProps) {
  const [isReady, setIsReady] = useState(false);

  // It takes a cycle for the XY chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <VisualizationContainer className="lnsXyExpression__container" isReady={isReady}>
      <MemoizedChart {...props} />
    </VisualizationContainer>
  );
}

export function XYChart({ data, args, formatFactory, timeZone }: XYChartRenderProps) {
  const { legend, layers, isHorizontal } = args;

  if (Object.values(data.tables).every(table => table.rows.length === 0)) {
    const icon: IconType = layers.length > 0 ? getIconForSeriesType(layers[0].seriesType) : 'bar';
    return (
      <EuiText className="lnsChart__empty" textAlign="center" color="subdued" size="xs">
        <EuiIcon type={icon} color="subdued" size="l" />
        <EuiSpacer size="s" />
        <p>
          <FormattedMessage
            id="xpack.lens.xyVisualization.noDataLabel"
            defaultMessage="No results found"
          />
        </p>
      </EuiText>
    );
  }

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = Object.values(data.tables)[0].columns.find(
    ({ id }) => id === layers[0].xAccessor
  );
  const xAxisFormatter = formatFactory(xAxisColumn && xAxisColumn.formatHint);

  // use default number formatter for y axis and use formatting hint if there is just a single y column
  let yAxisFormatter = formatFactory({ id: 'number' });
  if (layers.length === 1 && layers[0].accessors.length === 1) {
    const firstYAxisColumn = Object.values(data.tables)[0].columns.find(
      ({ id }) => id === layers[0].accessors[0]
    );
    if (firstYAxisColumn && firstYAxisColumn.formatHint) {
      yAxisFormatter = formatFactory(firstYAxisColumn.formatHint);
    }
  }

  const chartHasMoreThanOneSeries =
    layers.length > 1 || data.tables[Object.keys(data.tables)[0]].columns.length > 2;

  return (
    <Chart>
      <Settings
        showLegend={legend.isVisible ? chartHasMoreThanOneSeries : legend.isVisible}
        legendPosition={legend.position}
        showLegendDisplayValue={false}
        rotation={isHorizontal ? 90 : 0}
        theme={chartTheme}
      />

      <Axis
        id={getAxisId('x')}
        position={isHorizontal ? Position.Left : Position.Bottom}
        title={args.xTitle}
        showGridLines={false}
        hide={layers[0].hide}
        tickFormat={d => xAxisFormatter.convert(d)}
      />

      <Axis
        id={getAxisId('y')}
        position={isHorizontal ? Position.Bottom : Position.Left}
        title={args.yTitle}
        showGridLines={false}
        hide={layers[0].hide}
        tickFormat={d => yAxisFormatter.convert(d)}
      />

      {layers.map(
        (
          {
            splitAccessor,
            seriesType,
            accessors,
            xAccessor,
            layerId,
            columnToLabel,
            yScaleType,
            xScaleType,
            isHistogram,
          },
          index
        ) => {
          if (!data.tables[layerId] || data.tables[layerId].rows.length === 0) {
            return;
          }

          const columnToLabelMap = columnToLabel ? JSON.parse(columnToLabel) : {};

          const rows = data.tables[layerId].rows.map(row => {
            const newRow: typeof row = {};

            // Remap data to { 'Count of documents': 5 }
            Object.keys(row).forEach(key => {
              if (columnToLabelMap[key]) {
                newRow[columnToLabelMap[key]] = row[key];
              } else {
                newRow[key] = row[key];
              }
            });
            return newRow;
          });

          const splitAccessorLabel = columnToLabelMap[splitAccessor];
          const yAccessors = accessors.map(accessor => columnToLabelMap[accessor] || accessor);
          const idForLegend = splitAccessorLabel || yAccessors;

          const seriesProps = {
            key: index,
            splitSeriesAccessors: [splitAccessorLabel || splitAccessor],
            stackAccessors: seriesType.includes('stacked') ? [xAccessor] : [],
            id: getSpecId(idForLegend),
            xAccessor,
            yAccessors,
            data: rows,
            xScaleType,
            yScaleType,
            enableHistogramMode: isHistogram && (seriesType.includes('stacked') || !splitAccessor),
            timeZone,
          };

          return seriesType === 'line' ? (
            <LineSeries {...seriesProps} />
          ) : seriesType === 'bar' || seriesType === 'bar_stacked' ? (
            <BarSeries {...seriesProps} />
          ) : (
            <AreaSeries {...seriesProps} />
          );
        }
      )}
    </Chart>
  );
}
