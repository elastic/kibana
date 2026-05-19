import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import type { AggregateQuery } from '@kbn/es-query';
import type { VisualizeEditorContext, VisualizationMap, Suggestion, TypedLensByValueInput, TypedLensSerializedState } from '@kbn/lens-common';
/**
 * Injects the ESQL query into the lens layers. This is used to keep the query in sync with the lens layers.
 * @param attributes, the current lens attributes
 * @param query, the new query to inject
 * @returns the new lens attributes with the query injected
 */
export declare const injectESQLQueryIntoLensLayers: (attributes: TypedLensSerializedState["attributes"], query: AggregateQuery, suggestion: Suggestion) => {
    version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
    description?: string | undefined;
    title: string;
    references: import("@kbn/content-management-utils").Reference[];
    visualizationType: string;
    state: {
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        needsRefresh?: boolean | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: unknown;
    };
};
/**
 * Returns the suggestion updated with external visualization state for ES|QL charts
 * The visualization state is merged with the suggestion if the datasource is textBased, the columns match the context and the visualization type matches
 * @param suggestion the suggestion to be updated
 * @param visAttributes the preferred visualization attributes
 * @param context the lens suggestions api context as being set by the consumers
 * @returns updated suggestion
 */
export declare function mergeSuggestionWithVisContext({ suggestion, visAttributes, context, }: {
    suggestion: Suggestion;
    visAttributes: TypedLensByValueInput['attributes'];
    context: VisualizeFieldContext | VisualizeEditorContext;
}): Suggestion;
export declare const createSuggestionWithAttributes: (suggestion: Suggestion, preferredVisAttributes: TypedLensByValueInput["attributes"] | undefined, context: VisualizeFieldContext | VisualizeEditorContext) => Suggestion<unknown, unknown>;
/**
 * Selects the best suggestion for a target chart type, applying sub-type switching if needed
 * (e.g., bar → line within XY, pie → donut).
 */
export declare const selectAndApplyChartSuggestion: ({ suggestionsList, targetChartType, chartType, visualizationMap, preferredVisAttributes, context, }: {
    suggestionsList: Suggestion[];
    targetChartType: ChartType;
    chartType: string | undefined;
    visualizationMap: VisualizationMap;
    preferredVisAttributes: TypedLensByValueInput["attributes"] | undefined;
    context: VisualizeFieldContext | VisualizeEditorContext;
}) => Suggestion;
