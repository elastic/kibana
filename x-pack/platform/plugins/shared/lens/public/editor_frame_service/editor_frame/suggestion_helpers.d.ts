import type { Datatable } from '@kbn/expressions-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { Visualization, Datasource, DatasourceMap, VisualizationMap, VisualizeEditorContext, Suggestion, DatasourceLayers, SuggestionRequest, DatasourceStates, VisualizationState, DataViewsState } from '@kbn/lens-common';
import type { LensDispatch } from '../../state_management';
/**
 * This function takes a list of available data tables and a list of visualization
 * extensions and creates a ranked list of suggestions which contain a pair of a data table
 * and a visualization.
 *
 * Each suggestion represents a valid state of the editor and can be applied by creating an
 * action with `toSwitchAction` and dispatching it
 */
export declare function getSuggestions({ datasourceMap, datasourceStates, visualizationMap, activeVisualization, subVisualizationId, visualizationState, field, visualizeTriggerFieldContext, activeData, dataViews, mainPalette, allowMixed, query, }: {
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
}): Suggestion[];
export declare function getVisualizeFieldSuggestions({ datasourceMap, datasourceStates, visualizationMap, visualizeTriggerFieldContext, dataViews, }: {
    datasourceMap: DatasourceMap;
    datasourceStates: DatasourceStates;
    visualizationMap: VisualizationMap;
    subVisualizationId?: string;
    visualizeTriggerFieldContext?: VisualizeFieldContext | VisualizeEditorContext;
    dataViews: DataViewsState;
}): Suggestion | undefined;
export declare function switchToSuggestion(dispatchLens: LensDispatch, suggestion: Pick<Suggestion, 'visualizationId' | 'visualizationState' | 'datasourceState' | 'datasourceId'>, options?: {
    clearStagedPreview?: boolean;
    applyImmediately?: boolean;
}): void;
export declare function getTopSuggestionForField(datasourceLayers: DatasourceLayers, visualization: VisualizationState, datasourceStates: DatasourceStates, visualizationMap: Record<string, Visualization<unknown>>, datasource: Datasource, field: DragDropIdentifier, dataViews: DataViewsState, allowMixed?: boolean): Suggestion<unknown, unknown>;
