import type { FilterManager } from '@kbn/data-plugin/public';
import type { LensState, DatasourceMap, VisualizationMap } from '@kbn/lens-common';
export declare const selectPersistedDoc: (state: LensState) => import("@kbn/lens-common").LensDocument | undefined;
export declare const selectQuery: (state: LensState) => import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
export declare const selectSearchSessionId: (state: LensState) => string;
export declare const selectFilters: (state: LensState) => import("@kbn/es-query").Filter[];
export declare const selectResolvedDateRange: (state: LensState) => import("@kbn/lens-common").DateRange;
export declare const selectProjectRouting: (state: LensState) => import("@kbn/es-query").ProjectRouting;
export declare const selectAdHocDataViews: (state: LensState) => {
    [k: string]: import("@kbn/data-views-plugin/common").DataViewSpec;
};
export declare const selectVisualization: (state: LensState) => import("@kbn/lens-common").VisualizationState;
export declare const selectStagedPreview: (state: LensState) => import("@kbn/lens-common").PreviewState | undefined;
export declare const selectStagedActiveData: (state: LensState) => import("@kbn/lens-common").TableInspectorAdapter | undefined;
export declare const selectAutoApplyEnabled: (state: LensState) => boolean;
export declare const selectChangesApplied: (state: LensState) => boolean;
export declare const selectDatasourceStates: (state: LensState) => import("@kbn/lens-common").DatasourceStates;
export declare const selectVisualizationState: (state: LensState) => import("@kbn/lens-common").VisualizationState;
export declare const selectActiveDatasourceId: (state: LensState) => string | null;
export declare const selectActiveData: (state: LensState) => import("@kbn/lens-common").TableInspectorAdapter | undefined;
export declare const selectDataViews: (state: LensState) => import("@kbn/lens-common").DataViewsState;
export declare const selectIsManaged: (state: LensState) => boolean;
export declare const selectIsFullscreenDatasource: (state: LensState) => boolean;
export declare const selectSelectedLayerId: (state: LensState) => string | null;
/**
 * Selector to check if the text-based (ES|QL) editor should be hidden.
 * This is set to true when the parent application (e.g., Discover) explicitly
 * requests hiding the editor. Used primarily for flyout structure decisions.
 */
export declare const selectHideTextBasedEditor: (state: LensState) => boolean | undefined;
/**
 * Selector to determine if the user can edit a text-based (ES|QL) query.
 * Returns true only when:
 * 1. The editor is not explicitly hidden (hideTextBasedEditor is false)
 * 2. The current query is an aggregate/ES|QL query type
 *
 * Used by ESQLEditor and ConfigPanel to decide whether to render the ES|QL editor.
 */
export declare const selectCanEditTextBasedQuery: (state: LensState) => boolean;
export declare const selectTriggerApplyChanges: (state: LensState) => boolean;
export declare const selectExecutionContext: ((state: LensState) => {
    now: number;
    dateRange: import("@kbn/lens-common").DateRange;
    query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
    projectRouting: import("@kbn/es-query").ProjectRouting;
}) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery, args_1: import("@kbn/es-query").Filter[], args_2: import("@kbn/lens-common").DateRange, args_3: import("@kbn/es-query").ProjectRouting) => {
    now: number;
    dateRange: import("@kbn/lens-common").DateRange;
    query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
    projectRouting: import("@kbn/es-query").ProjectRouting;
}, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectExecutionContextSearch: ((state: LensState) => {
    now: number;
    query: import("@kbn/es-query").Query | undefined;
    timeRange: {
        from: string;
        to: string;
    };
    filters: import("@kbn/es-query").Filter[];
    disableWarningToasts: boolean;
    projectRouting: import("@kbn/es-query").ProjectRouting;
}) & import("reselect").OutputSelectorFields<(args_0: {
    now: number;
    dateRange: import("@kbn/lens-common").DateRange;
    query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
    projectRouting: import("@kbn/es-query").ProjectRouting;
}) => {
    now: number;
    query: import("@kbn/es-query").Query | undefined;
    timeRange: {
        from: string;
        to: string;
    };
    filters: import("@kbn/es-query").Filter[];
    disableWarningToasts: boolean;
    projectRouting: import("@kbn/es-query").ProjectRouting;
}, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectSavedObjectFormat: ((state: LensState, dependencies: {
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
    extractFilterReferences: FilterManager["extract"];
}) => import("@kbn/lens-common").LensDocument | undefined) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/lens-common").LensDocument | undefined, args_1: import("@kbn/lens-common").VisualizationState, args_2: import("@kbn/lens-common").DatasourceStates, args_3: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery, args_4: import("@kbn/es-query").Filter[], args_5: string | null, args_6: {
    [k: string]: import("@kbn/data-views-plugin/common").DataViewSpec;
}, args_7: {
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
    extractFilterReferences: FilterManager["extract"];
}) => import("@kbn/lens-common").LensDocument | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectCurrentVisualization: ((state: LensState) => import("@kbn/lens-common").VisualizationState) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/lens-common").VisualizationState, args_1: import("@kbn/lens-common").PreviewState | undefined) => import("@kbn/lens-common").VisualizationState, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectCurrentDatasourceStates: ((state: LensState) => import("@kbn/lens-common").DatasourceStates) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/lens-common").DatasourceStates, args_1: import("@kbn/lens-common").PreviewState | undefined) => import("@kbn/lens-common").DatasourceStates, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectAreDatasourcesLoaded: ((state: LensState) => boolean) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/lens-common").DatasourceStates) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectDatasourceLayers: ((state: LensState, dependencies: DatasourceMap) => Partial<Record<string, import("@kbn/lens-common").DatasourcePublicAPI>>) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/lens-common").DatasourceStates, args_1: DatasourceMap, args_2: import("@kbn/lens-common").DataViewsState) => Partial<Record<string, import("@kbn/lens-common").DatasourcePublicAPI>>, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFramePublicAPI: ((state: LensState, dependencies: DatasourceMap) => {
    absDateRange: import("@kbn/lens-common").DateRange;
    now: number;
    dateRange: import("@kbn/lens-common").DateRange;
    query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
    projectRouting: import("@kbn/es-query").ProjectRouting;
    datasourceLayers: Partial<Record<string, import("@kbn/lens-common").DatasourcePublicAPI>>;
    activeData: import("@kbn/lens-common").TableInspectorAdapter | undefined;
    dataViews: import("@kbn/lens-common").DataViewsState;
}) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/lens-common").DatasourceStates, args_1: import("@kbn/lens-common").TableInspectorAdapter | undefined, args_2: DatasourceMap, args_3: import("@kbn/lens-common").DataViewsState, args_4: {
    now: number;
    dateRange: import("@kbn/lens-common").DateRange;
    query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
    projectRouting: import("@kbn/es-query").ProjectRouting;
}) => {
    absDateRange: import("@kbn/lens-common").DateRange;
    now: number;
    dateRange: import("@kbn/lens-common").DateRange;
    query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
    projectRouting: import("@kbn/es-query").ProjectRouting;
    datasourceLayers: Partial<Record<string, import("@kbn/lens-common").DatasourcePublicAPI>>;
    activeData: import("@kbn/lens-common").TableInspectorAdapter | undefined;
    dataViews: import("@kbn/lens-common").DataViewsState;
}, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
