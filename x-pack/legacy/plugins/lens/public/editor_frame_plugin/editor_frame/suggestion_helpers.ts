/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { Visualization, TableSuggestion, Datasource, FramePublicAPI } from '../../types';
import { Action } from './state_management';

export interface Suggestion {
  visualizationId: string;
  datasourceState?: unknown;
  datasourceId?: string;
  keptLayerId: string;
  columns: number;
  score: number;
  title: string;
  visualizationState: unknown;
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
export function getSuggestions({
  datasourceMap,
  datasourceStates,
  visualizationMap,
  activeVisualizationId,
  visualizationState,
}: {
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  visualizationState: unknown;
}): Suggestion[] {
  const datasourceTableSuggestions = _.flatten(
    Object.entries(datasourceMap).map(([datasourceId, datasource]) => {
      if (datasourceStates[datasourceId] && !datasourceStates[datasourceId].isLoading) {
        return (
          datasource
            .getDatasourceSuggestionsFromCurrentState(datasourceStates[datasourceId])
            // TODO have the datasource in there by default
            .map(suggestion => ({ ...suggestion, datasourceId }))
        );
      } else {
        return [];
      }
    })
  ).map((suggestion, index) => ({
    ...suggestion,
    table: { ...suggestion.table, datasourceSuggestionId: index },
  }));
  const datasourceTables = datasourceTableSuggestions.map(({ table }) => table);

  return Object.entries(visualizationMap)
    .map(([visualizationId, visualization]) => {
      return visualization
        .getSuggestions({
          tables: datasourceTables,
          state: visualizationId === activeVisualizationId ? visualizationState : undefined,
        })
        .map(({ datasourceSuggestionId, state, ...suggestion }) => {
          const datasourceSuggestion = datasourceTableSuggestions[datasourceSuggestionId];
          return {
            ...suggestion,
            visualizationId,
            visualizationState: state,
            keptLayerId: datasourceSuggestion.table.layerId,
            datasourceState: datasourceSuggestion.state,
            datasourceId: datasourceSuggestion.datasourceId,
            columns: datasourceSuggestion.table.columns.length,
          };
        });
    })
    .reduce((globalList, currentList) => [...globalList, ...currentList], [])
    .sort(({ score: scoreA }, { score: scoreB }) => scoreB - scoreA);
}

export function switchToSuggestion(
  frame: FramePublicAPI,
  dispatch: (action: Action) => void,
  suggestion: Pick<
    Suggestion,
    'visualizationId' | 'visualizationState' | 'datasourceState' | 'datasourceId' | 'keptLayerId'
  >
) {
  const action: Action = {
    type: 'SWITCH_VISUALIZATION',
    newVisualizationId: suggestion.visualizationId,
    initialState: suggestion.visualizationState,
    datasourceState: suggestion.datasourceState,
    datasourceId: suggestion.datasourceId,
  };
  const layerIds = Object.keys(frame.datasourceLayers).filter(id => {
    return id !== suggestion.keptLayerId;
  });
  frame.removeLayers(layerIds);
  dispatch(action);
}
