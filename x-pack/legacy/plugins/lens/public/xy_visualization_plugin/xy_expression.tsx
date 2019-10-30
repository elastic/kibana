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
import { ExpressionFunction, KibanaDatatable } from 'src/legacy/core_plugins/interpreter/types';
import { IInterpreterRenderHandlers } from 'src/legacy/core_plugins/expressions/public';
import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { FormatFactory } from '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities';
import { IInterpreterRenderFunction } from '../../../../../../src/legacy/core_plugins/expressions/public';
import { LensMultiTable } from '../types';
import { XYArgs, SeriesType, visualizationTypes } from './types';
import { VisualizationContainer } from '../visualization_container';
import { isHorizontalChart } from './state_helpers';

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
  },
  context: {
    types: ['lens_multitable', 'kibana_context', 'null'],
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
  displayName: 'XY chart',
  help: i18n.translate('xpack.lens.xyChart.renderer.help', {
    defaultMessage: 'X/Y chart renderer',
  }),
  validate: () => {},
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

export function XYChart({ data, args, formatFactory, timeZone }: XYChartRenderProps) {
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
      />

      <Axis
        id={getAxisId('x')}
        position={shouldRotate ? Position.Left : Position.Bottom}
        title={xTitle}
        showGridLines={false}
        hide={layers[0].hide}
        tickFormat={d => xAxisFormatter.convert(d)}
      />

      <Axis
        id={getAxisId('y')}
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
          const splitAccessorLabel = columnToLabelMap[splitAccessor];
          const yAccessors = accessors.map(accessor => columnToLabelMap[accessor] || accessor);
          const idForLegend = splitAccessorLabel || yAccessors;
          const sanitized = sanitizeRows({
            splitAccessor,
            formatFactory,
            columnToLabelMap,
            table: data.tables[layerId],
          });

          const seriesProps = {
            key: index,
            splitSeriesAccessors: sanitized.splitAccessor ? [sanitized.splitAccessor] : [],
            stackAccessors: seriesType.includes('stacked') ? [xAccessor] : [],
            id: getSpecId(idForLegend),
            xAccessor,
            yAccessors,
            data: sanitized.rows,
            xScaleType,
            yScaleType,
            enableHistogramMode: isHistogram && (seriesType.includes('stacked') || !splitAccessor),
            timeZone,
          };

          return seriesType === 'line' ? (
            <LineSeries {...seriesProps} />
          ) : seriesType === 'bar' ||
            seriesType === 'bar_stacked' ||
            seriesType === 'bar_horizontal' ||
            seriesType === 'bar_horizontal_stacked' ? (
            <BarSeries {...seriesProps} />
          ) : (
            <AreaSeries {...seriesProps} />
          );
        }
      )}
    </Chart>
  );
}

/**
 * Renames the columns to match the user-configured accessors in
 * columnToLabelMap. If a splitAccessor is provided, formats the
 * values in that column.
 */
function sanitizeRows({
  splitAccessor,
  table,
  formatFactory,
  columnToLabelMap,
}: {
  splitAccessor?: string;
  table: KibanaDatatable;
  formatFactory: FormatFactory;
  columnToLabelMap: Record<string, string | undefined>;
}) {
  const column = table.columns.find(c => c.id === splitAccessor);
  const formatter = formatFactory(column && column.formatHint);

  return {
    splitAccessor: column && column.id,
    rows: table.rows.map(r => {
      const newRow: typeof r = {};

      if (column) {
        newRow[column.id] = formatter.convert(r[column.id]);
      }

      Object.keys(r).forEach(key => {
        const newKey = columnToLabelMap[key] || key;
        newRow[newKey] = r[key];
      });
      return newRow;
    }),
  };
}
