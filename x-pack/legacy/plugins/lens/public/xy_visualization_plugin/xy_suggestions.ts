/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { partition, isEqual } from 'lodash';
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
import { State, SeriesType, LayerConfig } from './types';
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
export function getSuggestions(
  opts: SuggestionRequest<State>
): Array<VisualizationSuggestion<State>> {
  return opts.tables
    .filter(
      ({ isMultiRow, columns }) =>
        // We only render line charts for multi-row queries. We require at least
        // two columns: one for x and at least one for y, and y columns must be numeric.
        // We reject any datasource suggestions which have a column of an unknown type.
        isMultiRow &&
        columns.length > 1 &&
        columns.some(col => col.operation.dataType === 'number') &&
        !columns.some(col => !columnSortOrder.hasOwnProperty(col.operation.dataType))
    )
    .map(table => getSuggestionForColumns(table, opts.state))
    .filter((suggestion): suggestion is VisualizationSuggestion<State> => suggestion !== undefined);
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
      table.datasourceSuggestionId,
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
      table.datasourceSuggestionId,
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
  datasourceSuggestionId: number,
  layerId: string,
  changeType: TableChangeType,
  xValue: TableSuggestionColumn,
  yValues: TableSuggestionColumn[],
  splitBy?: TableSuggestionColumn,
  currentState?: State,
  tableLabel?: string
): VisualizationSuggestion<State> {
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
  const isDate = xValue.operation.dataType === 'date';

  let title =
    tableLabel ||
    (isDate
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

  const oldLayer = currentState && currentState.layers.find(layer => layer.layerId === layerId);
  const seriesType: SeriesType =
    (oldLayer && oldLayer.seriesType) ||
    (currentState && currentState.preferredSeriesType) ||
    (splitBy && isDate ? 'line' : 'bar');
  let isHorizontal = currentState ? currentState.isHorizontal : false;
  let newLayer = {
    ...(oldLayer || {}),
    layerId,
    seriesType,
    xAccessor: xValue.columnId,
    splitAccessor: splitBy ? splitBy.columnId : generateId(),
    accessors: yValues.map(col => col.columnId),
    title: yTitle,
  };
  // if current state is using the same data, suggest same chart with different series type
  if (oldLayer && changeType === 'unchanged') {
    if (xValue.operation.scale && xValue.operation.scale !== 'ordinal') {
      const currentSeriesType = oldLayer.seriesType;
      const newSeriesType = currentSeriesType === 'area' ? 'bar' : 'area';
      // TODO i18n
      title = `${newSeriesType} chart`;
      newLayer = { ...newLayer, seriesType: newSeriesType };
    } else {
      // todo i18n
      title = 'Flip';
      isHorizontal = !isHorizontal;
    }
  }
  const state: State = {
    isHorizontal,
    legend: currentState ? currentState.legend : { isVisible: true, position: Position.Right },
    preferredSeriesType: seriesType,
    layers: [
      ...(currentState ? currentState.layers.filter(layer => layer.layerId !== layerId) : []),
      newLayer,
    ],
  };
  const metadata: Record<string, OperationMetadata> = {};

  [xValue, ...yValues, splitBy].forEach(col => {
    if (col) {
      metadata[col.columnId] = col.operation;
    }
  });

  const suggestion = {
    title,
    // chart with multiple y values and split series will have a score of 1, single y value and no split series reduce score
    score: ((yValues.length > 1 ? 2 : 1) + (splitBy ? 1 : 0)) / 3,
    datasourceSuggestionId,
    state,
    previewIcon: getIconForSeries(seriesType),
    previewExpression: buildExpression(
      {
        ...state,
        layers: state.layers
          .filter(layer => layer.layerId === layerId)
          .map(layer => ({ ...layer, hide: true })),
        legend: {
          ...state.legend,
          isVisible: false,
        },
      },
      { xTitle, yTitle },
      { [layerId]: metadata }
    ),
  };

  return suggestion;
}
