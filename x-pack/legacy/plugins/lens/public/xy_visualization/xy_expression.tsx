/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Chart,
  Settings,
  Axis,
  LineSeries,
  AreaSeries,
  BarSeries,
  Position,
  PartialTheme,
} from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import {
  IInterpreterRenderHandlers,
  ExpressionRenderDefinition,
  ExpressionFunctionDefinition,
  ExpressionValueSearchContext,
} from 'src/plugins/expressions/public';

import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { npStart } from 'ui/new_platform';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../src/legacy/core_plugins/visualizations/public/np_ready/public/embeddable/events';
import { FormatFactory } from '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities';
import { LensMultiTable } from '../types';
import { XYArgs, SeriesType, visualizationTypes } from './types';
import { VisualizationContainer } from '../visualization_container';
import { isHorizontalChart } from './state_helpers';

type InferPropType<T> = T extends React.FunctionComponent<infer P> ? P : T;
type SeriesSpec = InferPropType<typeof LineSeries> &
  InferPropType<typeof BarSeries> &
  InferPropType<typeof AreaSeries>;

export interface XYChartProps {
  data: LensMultiTable;
  args: XYArgs;
}

export interface XYRender {
  type: 'render';
  as: 'lens_xy_chart_renderer';
  value: XYChartProps;
}

type XYChartRenderProps = XYChartProps & {
  chartTheme: PartialTheme;
  formatFactory: FormatFactory;
  timeZone: string;
};

export const xyChart: ExpressionFunctionDefinition<
  'lens_xy_chart',
  LensMultiTable | ExpressionValueSearchContext | null,
  XYArgs,
  XYRender
> = {
  name: 'lens_xy_chart',
  type: 'render',
  inputTypes: ['lens_multitable', 'kibana_context', 'null'],
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      types: ['lens_xy_layer'] as any,
      help: 'Layers of visual series',
      multi: true,
    },
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
};

export const getXyChartRenderer = (dependencies: {
  formatFactory: FormatFactory;
  chartTheme: PartialTheme;
  timeZone: string;
}): ExpressionRenderDefinition<XYChartProps> => ({
  name: 'lens_xy_chart_renderer',
  displayName: 'XY chart',
  help: i18n.translate('xpack.lens.xyChart.renderer.help', {
    defaultMessage: 'X/Y chart renderer',
  }),
  validate: () => undefined,
  reuseDomNode: true,
  render: (domNode: Element, config: XYChartProps, handlers: IInterpreterRenderHandlers) => {
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    ReactDOM.render(
      <I18nProvider>
        <XYChartReportable {...config} {...dependencies} />
      </I18nProvider>,
      domNode,
      () => handlers.done()
    );
  },
});

function getIconForSeriesType(seriesType: SeriesType): IconType {
  return visualizationTypes.find(c => c.id === seriesType)!.icon || 'empty';
}

const MemoizedChart = React.memo(XYChart);

export function XYChartReportable(props: XYChartRenderProps) {
  const [state, setState] = useState({
    isReady: false,
  });

  // It takes a cycle for the XY chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, []);

  return (
    <VisualizationContainer className="lnsXyExpression__container" isReady={state.isReady}>
      <MemoizedChart {...props} />
    </VisualizationContainer>
  );
}

export function XYChart({ data, args, formatFactory, timeZone, chartTheme }: XYChartRenderProps) {
  const { legend, layers } = args;

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
    layers.length > 1 || data.tables[layers[0].layerId].columns.length > 2;
  const shouldRotate = isHorizontalChart(layers);

  const xTitle = (xAxisColumn && xAxisColumn.name) || args.xTitle;

  return (
    <Chart>
      <Settings
        showLegend={legend.isVisible ? chartHasMoreThanOneSeries : legend.isVisible}
        legendPosition={legend.position}
        showLegendDisplayValue={false}
        theme={chartTheme}
        rotation={shouldRotate ? 90 : 0}
        xDomain={
          data.dateRange && layers.every(l => l.xScaleType === 'time')
            ? {
                min: data.dateRange.fromDate.getTime(),
                max: data.dateRange.toDate.getTime(),
              }
            : undefined
        }
        onElementClick={([[geometry, series]]) => {
          const layer = layers.find(l =>
            series.seriesKeys.some(key => l.accessors.includes(key as string))
          )!;
          const table = data.tables[layer.layerId];

          const points = [
            {
              row: table.rows.findIndex(row => row[layer.xAccessor] === geometry.x),
              column: table.columns.findIndex(col => col.id === layer.xAccessor),
              value: geometry.x,
            },
          ];

          if (series.seriesKeys.length > 1) {
            const pointValue = series.seriesKeys[0];

            points.push({
              row: table.rows.findIndex(row => row[layer.splitAccessor] === pointValue),
              column: table.columns.findIndex(col => col.id === layer.splitAccessor),
              value: pointValue,
            });
          }

          npStart.plugins.uiActions.executeTriggerActions(VIS_EVENT_TO_TRIGGER.filter, {
            data: {
              data: points.map(point => ({
                row: point.row,
                column: point.column,
                value: point.value,
                table,
              })),
            },
          });
        }}
      />

      <Axis
        id="x"
        position={shouldRotate ? Position.Left : Position.Bottom}
        title={xTitle}
        showGridLines={false}
        hide={layers[0].hide}
        tickFormat={d => xAxisFormatter.convert(d)}
      />

      <Axis
        id="y"
        position={shouldRotate ? Position.Bottom : Position.Left}
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
          if (
            !data.tables[layerId] ||
            data.tables[layerId].rows.length === 0 ||
            data.tables[layerId].rows.every(row => typeof row[xAccessor] === 'undefined')
          ) {
            return;
          }

          const columnToLabelMap = columnToLabel ? JSON.parse(columnToLabel) : {};
          const idForLegend = accessors;
          const table = data.tables[layerId];

          const seriesProps: SeriesSpec = {
            splitSeriesAccessors: splitAccessor ? [splitAccessor] : [],
            stackAccessors: seriesType.includes('stacked') ? [xAccessor] : [],
            id: idForLegend.join(','),
            xAccessor,
            yAccessors: accessors,
            data: table.rows,
            xScaleType,
            yScaleType,
            enableHistogramMode: isHistogram && (seriesType.includes('stacked') || !splitAccessor),
            timeZone,
            customSeriesLabel: d => {
              if (accessors.length > 1) {
                return d.seriesKeys.map(key => columnToLabelMap[key] || key).join(' - ');
              }
              return columnToLabelMap[d.seriesKeys[0]] || null;
            },
          };

          return seriesType === 'line' ? (
            <LineSeries key={index} {...seriesProps} />
          ) : seriesType === 'bar' ||
            seriesType === 'bar_stacked' ||
            seriesType === 'bar_horizontal' ||
            seriesType === 'bar_horizontal_stacked' ? (
            <BarSeries key={index} {...seriesProps} />
          ) : (
            <AreaSeries key={index} {...seriesProps} />
          );
        }
      )}
    </Chart>
  );
}
