/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Ast } from '@kbn/interpreter/common';
import {
  Visualization,
  Datasource,
  FramePublicAPI,
  TableChangeType,
  TableSuggestion,
} from '../../types';
import { Action } from './state_management';

export interface Suggestion {
  visualizationId: string;
  datasourceState?: unknown;
  datasourceId?: string;
  keptLayerIds: string[];
  columns: number;
  score: number;
  title: string;
  visualizationState: unknown;
  previewExpression?: Ast | string;
  previewIcon: string;
  hide?: boolean;
  changeType: TableChangeType;
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
  field,
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
  field?: unknown;
}): Suggestion[] {
  const datasources = Object.entries(datasourceMap).filter(
    ([datasourceId]) => datasourceStates[datasourceId] && !datasourceStates[datasourceId].isLoading
  );

  const allLayerIds = _.flatten(
    datasources.map(([datasourceId, datasource]) =>
      datasource.getLayers(datasourceStates[datasourceId].state)
    )
  );

  // Collect all table suggestions from available datasources
  const datasourceTableSuggestions = _.flatten(
    datasources.map(([datasourceId, datasource]) => {
      const datasourceState = datasourceStates[datasourceId].state;
      return (field
        ? datasource.getDatasourceSuggestionsForField(datasourceState, field)
        : datasource.getDatasourceSuggestionsFromCurrentState(datasourceState)
      ).map(suggestion => ({ ...suggestion, datasourceId }));
    })
  );

  // Pass all table suggestions to all visualization extensions to get visualization suggestions
  // and rank them by score
  return _.flatten(
    Object.entries(visualizationMap).map(([visualizationId, visualization]) =>
      _.flatten(
        datasourceTableSuggestions.map(datasourceSuggestion => {
          const table = datasourceSuggestion.table;
          const currentVisualizationState =
            visualizationId === activeVisualizationId ? visualizationState : undefined;
          const keptLayerIds =
            visualizationId !== activeVisualizationId
              ? [datasourceSuggestion.table.layerId]
              : allLayerIds;
          return getVisualizationSuggestions(
            visualization,
            table,
            visualizationId,
            datasourceSuggestion,
            currentVisualizationState,
            keptLayerIds
          );
        })
      )
    )
  ).sort((a, b) => b.score - a.score);
}

/**
 * Queries a single visualization extensions for a single datasource suggestion and
 * creates an array of complete suggestions containing both the target datasource
 * state and target visualization state along with suggestion meta data like score,
 * title and preview expression.
 */
function getVisualizationSuggestions(
  visualization: Visualization<unknown, unknown>,
  table: TableSuggestion,
  visualizationId: string,
  datasourceSuggestion: { datasourceId: string; state: unknown; table: TableSuggestion },
  currentVisualizationState: unknown,
  keptLayerIds: string[]
) {
  return visualization
    .getSuggestions({
      table,
      state: currentVisualizationState,
    })
    .map(({ state, ...visualizationSuggestion }) => ({
      ...visualizationSuggestion,
      visualizationId,
      visualizationState: state,
      keptLayerIds,
      datasourceState: datasourceSuggestion.state,
      datasourceId: datasourceSuggestion.datasourceId,
      columns: table.columns.length,
      changeType: table.changeType,
    }));
}

export function switchToSuggestion(
  frame: FramePublicAPI,
  dispatch: (action: Action) => void,
  suggestion: Pick<
    Suggestion,
    'visualizationId' | 'visualizationState' | 'datasourceState' | 'datasourceId' | 'keptLayerIds'
  >
) {
  const action: Action = {
    type: 'SWITCH_VISUALIZATION',
    newVisualizationId: suggestion.visualizationId,
    initialState: suggestion.visualizationState,
    datasourceState: suggestion.datasourceState,
    datasourceId: suggestion.datasourceId,
  };
  dispatch(action);
  const layerIds = Object.keys(frame.datasourceLayers).filter(id => {
    return !suggestion.keptLayerIds.includes(id);
  });
  if (layerIds.length > 0) {
    frame.removeLayers(layerIds);
  }
}
