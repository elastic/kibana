/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuggestionRequest, VisualizationSuggestion, TableSuggestion } from '../types';
import { State } from './types';

/**
 * Generate suggestions for the metric chart.
 *
 * @param opts
 */
export function getSuggestions({
  table,
  state,
}: SuggestionRequest<State>): Array<VisualizationSuggestion<State>> {
  // We only render metric charts for single-row queries. We require a single, numeric column.
  if (
    table.isMultiRow ||
    table.columns.length > 1 ||
    table.columns[0].operation.dataType !== 'number'
  ) {
    return [];
  }

  // don't suggest current table if visualization is active
  if (state && table.changeType === 'unchanged') {
    return [];
  }

  return [getSuggestion(table)];
}

function getSuggestion(table: TableSuggestion): VisualizationSuggestion<State> {
  const col = table.columns[0];
  const title = table.label || col.operation.label;

  return {
    title,
    score: 0.5,
    previewIcon: 'visMetric',
    previewExpression: {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_metric_chart',
          arguments: {
            title: [''],
            accessor: [col.columnId],
            mode: ['reduced'],
          },
        },
      ],
    },
    state: {
      layerId: table.layerId,
      accessor: col.columnId,
    },
  };
}
