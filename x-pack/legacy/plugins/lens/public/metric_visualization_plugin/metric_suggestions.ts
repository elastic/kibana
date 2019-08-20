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
export function getSuggestions(
  opts: SuggestionRequest<State>
): Array<VisualizationSuggestion<State>> {
  return (
    opts.tables
      .filter(
        ({ isMultiRow, columns }) =>
          // We only render metric charts for single-row queries. We require a single, numeric column.
          !isMultiRow && columns.length === 1 && columns[0].operation.dataType === 'number'
      )
      // don't suggest current table if visualization is active
      .filter(({ changeType }) => !opts.state || changeType !== 'unchanged')
      .map(table => getSuggestion(table))
  );
}

function getSuggestion(table: TableSuggestion): VisualizationSuggestion<State> {
  const col = table.columns[0];
  const title = col.operation.label;

  return {
    title,
    score: 1,
    datasourceSuggestionId: table.datasourceSuggestionId,
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
