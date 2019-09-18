/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import {
  SuggestionRequest,
  VisualizationSuggestion,
  TableSuggestionColumn,
  TableSuggestion,
  OperationMetadata,
  TableChangeType,
} from '../types';
import { State, SeriesType, XYState } from './types';
import { generateId } from '../id_generator';
import { buildExpression } from './to_expression';

const columnSortOrder = {
  date: 0,
  string: 1,
  boolean: 2,
  number: 3,
};

function getIconForSeries(type: SeriesType): EuiIconType {
  switch (type) {
    case 'area':
    case 'area_stacked':
      return 'visArea';
    case 'bar':
    case 'bar_stacked':
      return 'visBarVertical';
    case 'line':
      return 'visLine';
    default:
      throw new Error('unknown series type');
  }
}

/**
 * Generate suggestions for the xy chart.
 *
 * @param opts
 */
export function getSuggestions({
  table,
  state,
}: SuggestionRequest<State>): Array<VisualizationSuggestion<State>> {
  if (
    // We only render line charts for multi-row queries. We require at least
    // two columns: one for x and at least one for y, and y columns must be numeric.
    // We reject any datasource suggestions which have a column of an unknown type.
    !table.isMultiRow ||
    table.columns.length <= 1 ||
    table.columns.every(col => col.operation.dataType !== 'number') ||
    table.columns.some(col => !columnSortOrder.hasOwnProperty(col.operation.dataType))
  ) {
    return [];
  }

  const suggestion = getSuggestionForColumns(table, state);

  if (suggestion) {
    return [suggestion];
  }

  return [];
}

function getSuggestionForColumns(
  table: TableSuggestion,
  currentState?: State
): VisualizationSuggestion<State> | undefined {
  const [buckets, values] = partition(
    prioritizeColumns(table.columns),
    col => col.operation.isBucketed
  );

  if (buckets.length === 1 || buckets.length === 2) {
    const [x, splitBy] = buckets;
    return getSuggestion(
      table.layerId,
      table.changeType,
      x,
      values,
      splitBy,
      currentState,
      table.label
    );
  } else if (buckets.length === 0) {
    const [x, ...yValues] = values;
    return getSuggestion(
      table.layerId,
      table.changeType,
      x,
      yValues,
      undefined,
      currentState,
      table.label
    );
  }
}

// This shuffles columns around so that the left-most column defualts to:
// date, string, boolean, then number, in that priority. We then use this
// order to pluck out the x column, and the split / stack column.
function prioritizeColumns(columns: TableSuggestionColumn[]) {
  return [...columns].sort(
    (a, b) => columnSortOrder[a.operation.dataType] - columnSortOrder[b.operation.dataType]
  );
}

function getSuggestion(
  layerId: string,
  changeType: TableChangeType,
  xValue: TableSuggestionColumn,
  yValues: TableSuggestionColumn[],
  splitBy?: TableSuggestionColumn,
  currentState?: State,
  tableLabel?: string
): VisualizationSuggestion<State> {
  const title = getSuggestionTitle(yValues, xValue, tableLabel);
  const seriesType: SeriesType = getSeriesType(currentState, layerId, xValue, changeType);
  const isHorizontal = currentState ? currentState.isHorizontal : false;

  const options = {
    isHorizontal,
    currentState,
    seriesType,
    layerId,
    title,
    yValues,
    splitBy,
    changeType,
    xValue,
  };

  const isSameState = currentState && changeType === 'unchanged';

  if (!isSameState) {
    return buildSuggestion(options);
  }

  // if current state is using the same data, suggest same chart with different presentational configuration

  if (xValue.operation.scale === 'ordinal') {
    // flip between horizontal/vertical for ordinal scales
    return buildSuggestion({
      ...options,
      title: i18n.translate('xpack.lens.xySuggestions.flipTitle', { defaultMessage: 'Flip' }),
      isHorizontal: !options.isHorizontal,
    });
  }

  // change chart type for interval or ratio scales on x axis
  const newSeriesType = flipSeriesType(seriesType);
  return buildSuggestion({
    ...options,
    seriesType: newSeriesType,
    title: newSeriesType.startsWith('area')
      ? i18n.translate('xpack.lens.xySuggestions.areaChartTitle', {
          defaultMessage: 'Area chart',
        })
      : i18n.translate('xpack.lens.xySuggestions.barChartTitle', {
          defaultMessage: 'Bar chart',
        }),
  });
}

function flipSeriesType(oldSeriesType: SeriesType) {
  switch (oldSeriesType) {
    case 'area':
      return 'bar';
    case 'area_stacked':
      return 'bar_stacked';
    case 'bar':
      return 'area';
    case 'bar_stacked':
      return 'area_stacked';
    default:
      return 'bar';
  }
}

function getSeriesType(
  currentState: XYState | undefined,
  layerId: string,
  xValue: TableSuggestionColumn,
  changeType: TableChangeType
): SeriesType {
  const defaultType = xValue.operation.dataType === 'date' ? 'area' : 'bar';
  const preferredSeriesType = (currentState && currentState.preferredSeriesType) || defaultType;
  const isDateCompatible =
    preferredSeriesType === 'area' ||
    preferredSeriesType === 'line' ||
    preferredSeriesType === 'area_stacked';

  if (changeType !== 'initial') {
    const oldLayer = getExistingLayer(currentState, layerId);
    return (
      (oldLayer && oldLayer.seriesType) ||
      (currentState && currentState.preferredSeriesType) ||
      defaultType
    );
  }

  if (xValue.operation.dataType === 'date') {
    return isDateCompatible ? preferredSeriesType : defaultType;
  }

  return isDateCompatible ? defaultType : preferredSeriesType;
}

function getSuggestionTitle(
  yValues: TableSuggestionColumn[],
  xValue: TableSuggestionColumn,
  tableLabel: string | undefined
) {
  const yTitle = yValues
    .map(col => col.operation.label)
    .join(
      i18n.translate('xpack.lens.xySuggestions.yAxixConjunctionSign', {
        defaultMessage: ' & ',
        description:
          'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
      })
    );
  const xTitle = xValue.operation.label;
  const title =
    tableLabel ||
    (xValue.operation.dataType === 'date'
      ? i18n.translate('xpack.lens.xySuggestions.dateSuggestion', {
          defaultMessage: '{yTitle} over {xTitle}',
          description:
            'Chart description for charts over time, like "Transfered bytes over log.timestamp"',
          values: { xTitle, yTitle },
        })
      : i18n.translate('xpack.lens.xySuggestions.nonDateSuggestion', {
          defaultMessage: '{yTitle} of {xTitle}',
          description:
            'Chart description for a value of some groups, like "Top URLs of top 5 countries"',
          values: { xTitle, yTitle },
        }));
  return title;
}

function buildSuggestion({
  isHorizontal,
  currentState,
  seriesType,
  layerId,
  title,
  yValues,
  splitBy,
  changeType,
  xValue,
}: {
  currentState: XYState | undefined;
  isHorizontal: boolean;
  seriesType: SeriesType;
  title: string;
  yValues: TableSuggestionColumn[];
  xValue: TableSuggestionColumn;
  splitBy: TableSuggestionColumn | undefined;
  layerId: string;
  changeType: string;
}) {
  const newLayer = {
    ...(getExistingLayer(currentState, layerId) || {}),
    layerId,
    seriesType,
    xAccessor: xValue.columnId,
    splitAccessor: splitBy ? splitBy.columnId : generateId(),
    accessors: yValues.map(col => col.columnId),
  };

  const state: State = {
    isHorizontal,
    legend: currentState ? currentState.legend : { isVisible: true, position: Position.Right },
    preferredSeriesType: seriesType,
    layers: [
      ...(currentState ? currentState.layers.filter(layer => layer.layerId !== layerId) : []),
      newLayer,
    ],
  };

  return {
    title,
    // chart with multiple y values and split series will have a score of 1, single y value and no split series reduce score
    score: ((yValues.length > 1 ? 2 : 1) + (splitBy ? 1 : 0)) / 3,
    // don't advertise chart of same type but with less data
    hide: currentState && changeType === 'reduced',
    state,
    previewIcon: getIconForSeries(seriesType),
    previewExpression: buildPreviewExpression(state, layerId, xValue, yValues, splitBy),
  };
}

function buildPreviewExpression(
  state: XYState,
  layerId: string,
  xValue: TableSuggestionColumn,
  yValues: TableSuggestionColumn[],
  splitBy: TableSuggestionColumn | undefined
) {
  return buildExpression(
    {
      ...state,
      // only show changed layer in preview and hide axes
      layers: state.layers
        .filter(layer => layer.layerId === layerId)
        .map(layer => ({ ...layer, hide: true })),
      // hide legend for preview
      legend: {
        ...state.legend,
        isVisible: false,
      },
    },
    { [layerId]: collectColumnMetaData(xValue, yValues, splitBy) }
  );
}

function getExistingLayer(currentState: XYState | undefined, layerId: string) {
  return currentState && currentState.layers.find(layer => layer.layerId === layerId);
}

function collectColumnMetaData(
  xValue: TableSuggestionColumn,
  yValues: TableSuggestionColumn[],
  splitBy: TableSuggestionColumn | undefined
) {
  const metadata: Record<string, OperationMetadata> = {};
  [xValue, ...yValues, splitBy].forEach(col => {
    if (col) {
      metadata[col.columnId] = col.operation;
    }
  });
  return metadata;
}
