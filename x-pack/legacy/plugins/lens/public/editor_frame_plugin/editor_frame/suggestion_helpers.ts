/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { Visualization, DatasourceSuggestion, TableSuggestion } from '../../types';
import { Action } from './state_management';

export interface Suggestion {
  visualizationId: string;
  datasourceState: unknown;
  score: number;
  title: string;
  state: unknown;
  previewExpression?: Ast | string;
  previewIcon: string;
}

/**
 * This function takes a list of available data tables and a list of visualization
 * extensions and creates a ranked list of suggestions which contain a pair of a data table
 * and a visualization.
 *
 * Each suggestion represents a valid state of the editor and can be applied by creating an
 * action with `toSwitchAction` and dispatching it
 */
export function getSuggestions(
  datasourceTableSuggestions: DatasourceSuggestion[],
  visualizationMap: Record<string, Visualization>,
  activeVisualizationId: string | null,
  visualizationState: unknown
): Suggestion[] {
  const datasourceTables: TableSuggestion[] = datasourceTableSuggestions.map(({ table }) => table);

  return Object.entries(visualizationMap)
    .map(([visualizationId, visualization]) => {
      return visualization
        .getSuggestions({
          tables: datasourceTables,
          state: visualizationId === activeVisualizationId ? visualizationState : undefined,
        })
        .map(({ datasourceSuggestionId, ...suggestion }) => ({
          ...suggestion,
          visualizationId,
          datasourceState: datasourceTableSuggestions.find(
            datasourceSuggestion =>
              datasourceSuggestion.table.datasourceSuggestionId === datasourceSuggestionId
          )!.state,
        }));
    })
    .reduce((globalList, currentList) => [...globalList, ...currentList], [])
    .sort(({ score: scoreA }, { score: scoreB }) => scoreB - scoreA);
}

export function toSwitchAction(suggestion: Suggestion): Action {
  return {
    type: 'SWITCH_VISUALIZATION',
    newVisualizationId: suggestion.visualizationId,
    initialState: suggestion.state,
    datasourceState: suggestion.datasourceState,
  };
}
