/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type {
  Visualization,
  Datasource,
  TableSuggestion,
  DatasourceSuggestion,
  DatasourceMap,
  VisualizationMap,
  VisualizeEditorContext,
  Suggestion,
  DatasourceLayers,
  SuggestionRequest,
  LensLayerType as LayerType,
  DatasourceStates,
  VisualizationState,
  DataViewsState,
} from '@kbn/lens-common';
import { showMemoizedErrorNotification } from '../../lens_ui_errors';
import type { LensDispatch } from '../../state_management';
import { switchVisualization, applyChanges } from '../../state_management';

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
  activeVisualization,
  subVisualizationId,
  visualizationState,
  field,
  visualizeTriggerFieldContext,
  activeData,
  dataViews,
  mainPalette,
  allowMixed,
  query,
}: {
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  visualizationMap: VisualizationMap;
  activeVisualization?: Visualization;
  subVisualizationId?: string;
  visualizationState: unknown;
  field?: unknown;
  visualizeTriggerFieldContext?: VisualizeFieldContext | VisualizeEditorContext;
  activeData?: Record<string, Datatable>;
  dataViews: DataViewsState;
  mainPalette?: SuggestionRequest['mainPalette'];
  allowMixed?: boolean;
  /** Optional query (e.g. ES|QL) for context-aware suggestions (e.g. prefer line for time series). */
  query?: AggregateQuery;
}): Suggestion[] {
  const datasources = Object.entries(datasourceMap).filter(
    ([datasourceId]) => datasourceStates[datasourceId] && !datasourceStates[datasourceId].isLoading
  );

  const layerTypesMap = datasources.reduce((memo, [datasourceId, datasource]) => {
    const datasourceState = datasourceStates[datasourceId].state;
    if (!activeVisualization || !datasourceState) {
      return memo;
    }
    const layers = datasource.getLayers(datasourceState);
    for (const layerId of layers) {
      const type = activeVisualization.getLayerType(layerId, visualizationState) || LayerTypes.DATA;
      memo[layerId] = type;
    }
    return memo;
  }, {} as Record<string, LayerType>);

  const isLayerSupportedByVisualization = (layerId: string, supportedTypes: LayerType[]) =>
    supportedTypes.includes(layerTypesMap[layerId] ?? LayerTypes.DATA);

  // Collect all table suggestions from available datasources
  const datasourceTableSuggestions = datasources.flatMap(([datasourceId, datasource]) => {
    const datasourceState = datasourceStates[datasourceId].state;
    let dataSourceSuggestions;
    try {
      // context is used to pass the state from location to datasource
      if (visualizeTriggerFieldContext) {
        // used for navigating from VizEditor to Lens
        if ('isVisualizeAction' in visualizeTriggerFieldContext) {
          dataSourceSuggestions = datasource.getDatasourceSuggestionsForVisualizeCharts(
            datasourceState,
            visualizeTriggerFieldContext.layers,
            dataViews.indexPatterns
          );
        } else {
          // used for navigating from Discover to Lens
          dataSourceSuggestions = datasource.getDatasourceSuggestionsForVisualizeField(
            datasourceState,
            visualizeTriggerFieldContext.dataViewSpec.id!,
            visualizeTriggerFieldContext.fieldName,
            dataViews.indexPatterns
          );
        }
      } else if (field) {
        dataSourceSuggestions = datasource.getDatasourceSuggestionsForField(
          datasourceState,
          field,
          (layerId) => isLayerSupportedByVisualization(layerId, [LayerTypes.DATA]), // a field dragged to workspace should added to data layer
          dataViews.indexPatterns
        );
      } else {
        dataSourceSuggestions = datasource.getDatasourceSuggestionsFromCurrentState(
          datasourceState,
          dataViews.indexPatterns,
          (layerId) => isLayerSupportedByVisualization(layerId, [LayerTypes.DATA]),
          activeData
        );
      }
    } catch (error) {
      showMemoizedErrorNotification(error);
      return [];
    }
    return dataSourceSuggestions.map((suggestion) => ({ ...suggestion, datasourceId }));
  });
  // Pass all table suggestions to all visualization extensions to get visualization suggestions
  // and rank them by score
  return Object.entries(visualizationMap)
    .flatMap(([visualizationId, visualization]) => {
      // in case a missing visualization type is passed via SO, just avoid to compute anything for it
      if (!visualization) {
        return [];
      }
      const supportedLayerTypes = visualization.getSupportedLayers().map(({ type }) => type);
      return datasourceTableSuggestions
        .filter((datasourceSuggestion) => {
          const filteredCount = datasourceSuggestion.keptLayerIds.filter((layerId) =>
            isLayerSupportedByVisualization(layerId, supportedLayerTypes)
          ).length;
          // make it pass either suggestions with some ids left after filtering
          // or suggestion with already 0 ids before the filtering (testing purposes)
          return filteredCount || filteredCount === datasourceSuggestion.keptLayerIds.length;
        })
        .flatMap((datasourceSuggestion) => {
          const datasourceId = datasourceSuggestion.datasourceId;
          const table = datasourceSuggestion.table;
          const currentVisualizationState =
            visualizationId === activeVisualization?.id ? visualizationState : undefined;
          const palette = mainPalette || activeVisualization?.getMainPalette?.(visualizationState);

          return getVisualizationSuggestions(
            visualization,
            table,
            visualizationId,
            {
              ...datasourceSuggestion,
              keptLayerIds: datasourceSuggestion.keptLayerIds.filter((layerId) =>
                isLayerSupportedByVisualization(layerId, supportedLayerTypes)
              ),
            },
            currentVisualizationState,
            subVisualizationId,
            palette,
            visualizeTriggerFieldContext && 'isVisualizeAction' in visualizeTriggerFieldContext,
            activeData,
            allowMixed,
            datasourceId,
            query
          );
        });
    })
    .sort((a, b) => b.score - a.score);
}

export function getVisualizeFieldSuggestions({
  datasourceMap,
  datasourceStates,
  visualizationMap,
  visualizeTriggerFieldContext,
  dataViews,
}: {
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  visualizationMap: VisualizationMap;
  subVisualizationId?: string;
  visualizeTriggerFieldContext?: VisualizeFieldContext | VisualizeEditorContext;
  dataViews: DataViewsState;
}): Suggestion | undefined {
  const activeVisualization = visualizationMap?.[Object.keys(visualizationMap)[0]] || null;
  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualization,
    visualizationState: undefined,
    visualizeTriggerFieldContext,
    dataViews,
  });

  if (visualizeTriggerFieldContext && 'isVisualizeAction' in visualizeTriggerFieldContext) {
    const allSuggestions = suggestions.filter(
      (s) => s.visualizationId === visualizeTriggerFieldContext.type
    );
    const visualization = visualizationMap[visualizeTriggerFieldContext.type] || null;
    return visualization?.getSuggestionFromConvertToLensContext?.({
      suggestions: allSuggestions,
      context: visualizeTriggerFieldContext,
    });
  }
  // suggestions for visualizing textbased languages
  if (visualizeTriggerFieldContext && 'query' in visualizeTriggerFieldContext) {
    if (visualizeTriggerFieldContext.query) {
      return suggestions.find((s) => s.datasourceId === 'textBased');
    }
  }

  if (suggestions.length) {
    return suggestions.find((s) => s.visualizationId === activeVisualization?.id) || suggestions[0];
  }
}

/**
 * Queries a single visualization extensions for a single datasource suggestion and
 * creates an array of complete suggestions containing both the target datasource
 * state and target visualization state along with suggestion meta data like score,
 * title and preview expression.
 */
function getVisualizationSuggestions(
  visualization: Visualization<unknown>,
  table: TableSuggestion,
  visualizationId: string,
  datasourceSuggestion: DatasourceSuggestion & { datasourceId: string },
  currentVisualizationState: unknown,
  subVisualizationId?: string,
  mainPalette?: SuggestionRequest['mainPalette'],
  isFromContext?: boolean,
  activeData?: Record<string, Datatable>,
  allowMixed?: boolean,
  datasourceId?: string,
  query?: AggregateQuery
) {
  try {
    const isSubtypeSupported =
      subVisualizationId && visualization?.isSubtypeSupported?.(subVisualizationId);
    return visualization
      .getSuggestions({
        table,
        state: currentVisualizationState,
        keptLayerIds: datasourceSuggestion.keptLayerIds,
        subVisualizationId: isSubtypeSupported ? subVisualizationId : undefined,
        mainPalette,
        isFromContext,
        activeData,
        allowMixed,
        datasourceId,
        query,
      })
      .map(({ state, ...visualizationSuggestion }) => ({
        ...visualizationSuggestion,
        visualizationId,
        visualizationState: state,
        keptLayerIds: datasourceSuggestion.keptLayerIds,
        datasourceState: datasourceSuggestion.state,
        datasourceId: datasourceSuggestion.datasourceId,
        columns: table.columns.length,
        changeType: table.changeType,
      }));
  } catch (e) {
    showMemoizedErrorNotification(e);
    return [];
  }
}

export function switchToSuggestion(
  dispatchLens: LensDispatch,
  suggestion: Pick<
    Suggestion,
    'visualizationId' | 'visualizationState' | 'datasourceState' | 'datasourceId'
  >,
  options?: {
    clearStagedPreview?: boolean;
    applyImmediately?: boolean;
  }
) {
  dispatchLens(
    switchVisualization({
      suggestion: {
        newVisualizationId: suggestion.visualizationId,
        visualizationState: suggestion.visualizationState,
        datasourceState: suggestion.datasourceState,
        datasourceId: suggestion.datasourceId!,
      },
      clearStagedPreview: options?.clearStagedPreview,
    })
  );
  if (options?.applyImmediately) {
    dispatchLens(applyChanges());
  }
}

export function getTopSuggestionForField(
  datasourceLayers: DatasourceLayers,
  visualization: VisualizationState,
  datasourceStates: DatasourceStates,
  visualizationMap: Record<string, Visualization<unknown>>,
  datasource: Datasource,
  field: DragDropIdentifier,
  dataViews: DataViewsState,
  allowMixed?: boolean
) {
  const hasData = Object.values(datasourceLayers).some(
    (datasourceLayer) => datasourceLayer && datasourceLayer.getTableSpec().length > 0
  );

  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : undefined;

  const mainPalette = activeVisualization?.getMainPalette?.(visualization.state);
  const suggestions = getSuggestions({
    datasourceMap: { [datasource.id]: datasource },
    datasourceStates,
    visualizationMap:
      hasData && visualization.activeId
        ? { [visualization.activeId]: activeVisualization! }
        : visualizationMap,
    activeVisualization,
    visualizationState: visualization.state,
    field,
    mainPalette,
    dataViews,
    allowMixed,
  });
  return (
    suggestions.find((s) => s.visualizationId === visualization.activeId) ||
    suggestions.filter((suggestion) => !suggestion.hide)[0] ||
    suggestions[0]
  );
}
