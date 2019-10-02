/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import {
  SuggestionRequest,
  VisualizationSuggestion,
  TableSuggestionColumn,
  TableSuggestion,
  TableChangeType,
} from '../types';
import { State, SeriesType, XYState } from './types';
import { generateId } from '../id_generator';
import { getIconForSeries } from './state_helpers';

const columnSortOrder = {
  date: 0,
  string: 1,
  ip: 2,
  boolean: 3,
  number: 4,
};

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

  const suggestions = getSuggestionForColumns(table, state);

  if (suggestions && suggestions instanceof Array) {
    return suggestions;
  }

  return suggestions ? [suggestions] : [];
}

function getSuggestionForColumns(
  table: TableSuggestion,
  currentState?: State
): VisualizationSuggestion<State> | Array<VisualizationSuggestion<State>> | undefined {
  const [buckets, values] = partition(table.columns, col => col.operation.isBucketed);

  if (buckets.length === 1 || buckets.length === 2) {
    const [x, splitBy] = getBucketMappings(table, currentState);
    return getSuggestionsForLayer(
      table.layerId,
      table.changeType,
      x,
      values,
      splitBy,
      currentState,
      table.label
    );
  } else if (buckets.length === 0) {
    const [x, ...yValues] = prioritizeColumns(values);
    return getSuggestionsForLayer(
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

function getBucketMappings(table: TableSuggestion, currentState?: State) {
  const currentLayer =
    currentState && currentState.layers.find(({ layerId }) => layerId === table.layerId);

  const buckets = table.columns.filter(col => col.operation.isBucketed);
  // reverse the buckets before prioritization to always use the most inner
  // bucket of the highest-prioritized group as x value (don't use nested
  // buckets as split series)
  const prioritizedBuckets = prioritizeColumns(buckets.reverse());

  if (!currentLayer || table.changeType === 'initial') {
    return prioritizedBuckets;
  }

  // if existing table is just modified, try to map buckets to the current dimensions
  const currentXColumnIndex = prioritizedBuckets.findIndex(
    ({ columnId }) => columnId === currentLayer.xAccessor
  );
  const currentXDataType =
    currentXColumnIndex > -1 && prioritizedBuckets[currentXColumnIndex].operation.dataType;

  if (
    currentXDataType &&
    // make sure time gets mapped to x dimension even when changing current bucket/dimension mapping
    (currentXDataType === 'date' || prioritizedBuckets[0].operation.dataType !== 'date')
  ) {
    const [x] = prioritizedBuckets.splice(currentXColumnIndex, 1);
    prioritizedBuckets.unshift(x);
  }

  const currentSplitColumnIndex = prioritizedBuckets.findIndex(
    ({ columnId }) => columnId === currentLayer.splitAccessor
  );
  if (currentSplitColumnIndex > -1) {
    const [splitBy] = prioritizedBuckets.splice(currentSplitColumnIndex, 1);
    prioritizedBuckets.push(splitBy);
  }

  return prioritizedBuckets;
}

// This shuffles columns around so that the left-most column defualts to:
// date, string, boolean, then number, in that priority. We then use this
// order to pluck out the x column, and the split / stack column.
function prioritizeColumns(columns: TableSuggestionColumn[]) {
  return [...columns].sort(
    (a, b) => columnSortOrder[a.operation.dataType] - columnSortOrder[b.operation.dataType]
  );
}

function getSuggestionsForLayer(
  layerId: string,
  changeType: TableChangeType,
  xValue: TableSuggestionColumn,
  yValues: TableSuggestionColumn[],
  splitBy?: TableSuggestionColumn,
  currentState?: State,
  tableLabel?: string
): VisualizationSuggestion<State> | Array<VisualizationSuggestion<State>> {
  const title = getSuggestionTitle(yValues, xValue, tableLabel);
  const seriesType: SeriesType = getSeriesType(currentState, layerId, xValue, changeType);

  const options = {
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

  const sameStateSuggestions: Array<VisualizationSuggestion<State>> = [];

  // if current state is using the same data, suggest same chart with different presentational configuration
  if (seriesType !== 'line' && xValue.operation.scale === 'ordinal') {
    // flip between horizontal/vertical for ordinal scales
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        title: i18n.translate('xpack.lens.xySuggestions.flipTitle', { defaultMessage: 'Flip' }),
        seriesType:
          seriesType === 'bar_horizontal'
            ? 'bar'
            : seriesType === 'bar_horizontal_stacked'
            ? 'bar_stacked'
            : 'bar_horizontal',
      })
    );
  } else {
    // change chart type for interval or ratio scales on x axis
    const newSeriesType = altSeriesType(seriesType);
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        seriesType: newSeriesType,
        title: newSeriesType.startsWith('bar')
          ? i18n.translate('xpack.lens.xySuggestions.barChartTitle', {
              defaultMessage: 'Bar chart',
            })
          : i18n.translate('xpack.lens.xySuggestions.lineChartTitle', {
              defaultMessage: 'Line chart',
            }),
      })
    );
  }

  if (seriesType !== 'line' && splitBy) {
    // flip between stacked/unstacked
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        seriesType: toggleStackSeriesType(seriesType),
        title: seriesType.endsWith('stacked')
          ? i18n.translate('xpack.lens.xySuggestions.unstackedChartTitle', {
              defaultMessage: 'Unstacked',
            })
          : i18n.translate('xpack.lens.xySuggestions.stackedChartTitle', {
              defaultMessage: 'Stacked',
            }),
      })
    );
  }

  return sameStateSuggestions;
}

function toggleStackSeriesType(oldSeriesType: SeriesType) {
  switch (oldSeriesType) {
    case 'area':
      return 'area_stacked';
    case 'area_stacked':
      return 'area';
    case 'bar':
      return 'bar_stacked';
    case 'bar_stacked':
      return 'bar';
    default:
      return oldSeriesType;
  }
}

// Until the area chart rendering bug is fixed, avoid suggesting area charts
// https://github.com/elastic/elastic-charts/issues/388
function altSeriesType(oldSeriesType: SeriesType) {
  switch (oldSeriesType) {
    case 'area':
      return 'line';
    case 'area_stacked':
      return 'bar_stacked';
    case 'bar':
      return 'line';
    case 'bar_stacked':
      return 'line';
    case 'line':
    default:
      return 'bar_stacked';
  }
}

function getSeriesType(
  currentState: XYState | undefined,
  layerId: string,
  xValue: TableSuggestionColumn,
  changeType: TableChangeType
): SeriesType {
  const defaultType = 'bar_stacked';

  const oldLayer = getExistingLayer(currentState, layerId);
  const oldLayerSeriesType = oldLayer ? oldLayer.seriesType : false;

  const closestSeriesType =
    oldLayerSeriesType || (currentState && currentState.preferredSeriesType) || defaultType;

  // Attempt to keep the seriesType consistent on initial add of a layer
  // Ordinal scales should always use a bar because there is no interpolation between buckets
  if (xValue.operation.scale && xValue.operation.scale === 'ordinal') {
    return closestSeriesType.startsWith('bar') ? closestSeriesType : defaultType;
  }

  if (changeType === 'initial') {
    return defaultType;
  }

  return closestSeriesType !== defaultType ? closestSeriesType : defaultType;
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
  seriesType: SeriesType;
  title: string;
  yValues: TableSuggestionColumn[];
  xValue: TableSuggestionColumn;
  splitBy: TableSuggestionColumn | undefined;
  layerId: string;
  changeType: TableChangeType;
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
    legend: currentState ? currentState.legend : { isVisible: true, position: Position.Right },
    preferredSeriesType: seriesType,
    layers: [
      ...(currentState ? currentState.layers.filter(layer => layer.layerId !== layerId) : []),
      newLayer,
    ],
  };

  return {
    title,
    score: getScore(yValues, splitBy, changeType),
    // don't advertise chart of same type but with less data
    hide: currentState && changeType === 'reduced',
    state,
    previewIcon: getIconForSeries(seriesType),
  };
}

function getScore(
  yValues: TableSuggestionColumn[],
  splitBy: TableSuggestionColumn | undefined,
  changeType: TableChangeType
) {
  // Unchanged table suggestions half the score because the underlying data doesn't change
  const changeFactor = changeType === 'unchanged' ? 0.5 : 1;
  // chart with multiple y values and split series will have a score of 1, single y value and no split series reduce score
  return (((yValues.length > 1 ? 2 : 1) + (splitBy ? 1 : 0)) / 3) * changeFactor;
}

function getExistingLayer(currentState: XYState | undefined, layerId: string) {
  return currentState && currentState.layers.find(layer => layer.layerId === layerId);
}
