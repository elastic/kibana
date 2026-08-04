import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import type { History } from 'history';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import type { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import type { DateRange, VisualizationState, DataViewsState, VisualizationMap, DatasourceMap, SeriesType, VisualizeEditorContext, LensAppState, LensStoreDeps, TableInspectorAdapter, DragDropOperation, IndexPattern, LensEditEvent, LensEditContextMapping } from '@kbn/lens-common';
import type { LensSerializedState, LayerType } from '..';
export declare const initialState: LensAppState;
export declare const getPreloadedState: ({ lensServices: { data }, initialContext, initialStateFromLocator, embeddableEditorIncomingState, datasourceMap, visualizationMap, visualizationType, }: LensStoreDeps) => LensAppState;
export interface SetExecutionContextPayload {
    query?: Query;
    filters?: Filter[];
    searchSessionId?: string;
    resolvedDateRange?: DateRange;
}
export interface InitialAppState {
    initialInput?: LensSerializedState;
    redirectCallback?: (savedObjectId?: string) => void;
    history?: History<unknown>;
    inlineEditing?: boolean;
    /** If true, hides the ES|QL editor in the flyout, used by Discover */
    hideTextBasedEditor?: boolean;
}
export declare const setState: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<LensAppState>, string>;
export declare const setExecutionContext: import("redux-toolkit-v1").ActionCreatorWithPayload<SetExecutionContextPayload, string>;
export declare const initExisting: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<LensAppState>, string>;
export declare const onActiveDataChange: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    activeData: TableInspectorAdapter;
}, string>;
export declare const setSaveable: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>;
export declare const enableAutoApply: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
export declare const disableAutoApply: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
export declare const applyChanges: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
export declare const setChangesApplied: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>;
export declare const updateDatasourceState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    newDatasourceState: unknown;
    datasourceId: string;
    clearStagedPreview?: boolean;
    dontSyncLinkedDimensions?: boolean;
}, string>;
export declare const updateVisualizationState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    newState: unknown;
    dontSyncLinkedDimensions?: boolean;
}, string>;
export declare const insertLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    datasourceId: string;
}, string>;
export declare const switchVisualization: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    suggestion: {
        newVisualizationId: string;
        visualizationState: unknown;
        datasourceState?: unknown;
        datasourceId?: string;
    };
    clearStagedPreview?: boolean;
}, string>;
export declare const rollbackSuggestion: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
export declare const setToggleFullscreen: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
export declare const setIsLoadLibraryVisible: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>;
export declare const submitSuggestion: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
export declare const switchDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    newDatasourceId: string;
}, string>;
export declare const switchAndCleanDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    newDatasourceId: string;
    visualizationId: string | null;
    currentIndexPatternId?: string;
}, string>;
export declare const navigateAway: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
export declare const loadInitial: import("redux-toolkit-v1").ActionCreatorWithPayload<InitialAppState, string>;
export declare const initEmpty: import("redux-toolkit-v1").ActionCreatorWithPreparedPayload<[{
    newState: Partial<LensAppState>;
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}], {
    layerId: string;
    newState: Partial<LensAppState>;
    initialContext: VisualizeFieldContext | VisualizeEditorContext | undefined;
}, "initEmpty", never, never>;
export declare const editVisualizationAction: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    event: LensEditEvent<keyof LensEditContextMapping>;
}, string>;
export declare const removeLayers: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: VisualizationState["activeId"];
    layerIds: string[];
}, string>;
export declare const removeOrClearLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    layerId: string;
    layerIds: string[];
}, string>;
export declare const setSelectedLayerId: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string | null;
}, string>;
export declare const cloneLayer: import("redux-toolkit-v1").ActionCreatorWithPreparedPayload<[{
    layerId: string;
}], {
    newLayerId: string;
    layerId: string;
}, "cloneLayer", never, never>;
export declare const addLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    layerType: LayerType;
    extraArg: unknown;
    ignoreInitialValues?: boolean;
    seriesType?: SeriesType;
}, string>;
export declare const onDropToDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    source: DragDropIdentifier;
    target: DragDropOperation;
    dropType: DropType;
}, string>;
export declare const setLayerDefaultDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    groupId: string;
}, string>;
export declare const setDimensionAndUpdateDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    datasourceId: string;
    newDatasourceState: unknown;
    layerId: string;
    groupId: string;
    columnId: string;
}, string>;
export declare const updateIndexPatterns: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<DataViewsState>, string>;
export declare const replaceIndexpattern: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    newIndexPattern: IndexPattern;
    oldId: string;
}, string>;
export declare const changeIndexPattern: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationIds?: string[];
    datasourceIds?: string[];
    indexPatternId: string;
    layerId?: string;
    dataViews: Partial<DataViewsState>;
}, string>;
export declare const removeDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    datasourceId?: string;
}, string>;
export declare const registerLibraryAnnotationGroup: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    group: EventAnnotationGroupConfig;
    id: string;
}, string>;
export declare const lensActions: {
    initExisting: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<LensAppState>, string>;
    setState: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<LensAppState>, string>;
    setExecutionContext: import("redux-toolkit-v1").ActionCreatorWithPayload<SetExecutionContextPayload, string>;
    onActiveDataChange: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        activeData: TableInspectorAdapter;
    }, string>;
    setSaveable: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>;
    enableAutoApply: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
    disableAutoApply: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
    applyChanges: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
    setChangesApplied: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>;
    updateDatasourceState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        newDatasourceState: unknown;
        datasourceId: string;
        clearStagedPreview?: boolean;
        dontSyncLinkedDimensions?: boolean;
    }, string>;
    updateVisualizationState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        visualizationId: string;
        newState: unknown;
        dontSyncLinkedDimensions?: boolean;
    }, string>;
    insertLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        layerId: string;
        datasourceId: string;
    }, string>;
    switchVisualization: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        suggestion: {
            newVisualizationId: string;
            visualizationState: unknown;
            datasourceState?: unknown;
            datasourceId?: string;
        };
        clearStagedPreview?: boolean;
    }, string>;
    rollbackSuggestion: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
    setToggleFullscreen: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
    setIsLoadLibraryVisible: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>;
    submitSuggestion: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
    switchDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        newDatasourceId: string;
    }, string>;
    switchAndCleanDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        newDatasourceId: string;
        visualizationId: string | null;
        currentIndexPatternId?: string;
    }, string>;
    navigateAway: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>;
    loadInitial: import("redux-toolkit-v1").ActionCreatorWithPayload<InitialAppState, string>;
    initEmpty: import("redux-toolkit-v1").ActionCreatorWithPreparedPayload<[{
        newState: Partial<LensAppState>;
        initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    }], {
        layerId: string;
        newState: Partial<LensAppState>;
        initialContext: VisualizeFieldContext | VisualizeEditorContext | undefined;
    }, "initEmpty", never, never>;
    editVisualizationAction: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        visualizationId: string;
        event: LensEditEvent<keyof LensEditContextMapping>;
    }, string>;
    removeLayers: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        visualizationId: VisualizationState["activeId"];
        layerIds: string[];
    }, string>;
    removeOrClearLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        visualizationId: string;
        layerId: string;
        layerIds: string[];
    }, string>;
    setSelectedLayerId: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        layerId: string | null;
    }, string>;
    addLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        layerId: string;
        layerType: LayerType;
        extraArg: unknown;
        ignoreInitialValues?: boolean;
        seriesType?: SeriesType;
    }, string>;
    onDropToDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        source: DragDropIdentifier;
        target: DragDropOperation;
        dropType: DropType;
    }, string>;
    setDimensionAndUpdateDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        visualizationId: string;
        datasourceId: string;
        newDatasourceState: unknown;
        layerId: string;
        groupId: string;
        columnId: string;
    }, string>;
    cloneLayer: import("redux-toolkit-v1").ActionCreatorWithPreparedPayload<[{
        layerId: string;
    }], {
        newLayerId: string;
        layerId: string;
    }, "cloneLayer", never, never>;
    setLayerDefaultDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        layerId: string;
        columnId: string;
        groupId: string;
    }, string>;
    updateIndexPatterns: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<DataViewsState>, string>;
    replaceIndexpattern: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        newIndexPattern: IndexPattern;
        oldId: string;
    }, string>;
    changeIndexPattern: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        visualizationIds?: string[];
        datasourceIds?: string[];
        indexPatternId: string;
        layerId?: string;
        dataViews: Partial<DataViewsState>;
    }, string>;
    removeDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        layerId: string;
        columnId: string;
        datasourceId?: string;
    }, string>;
    syncLinkedDimensions: typeof syncLinkedDimensions;
    registerLibraryAnnotationGroup: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        group: EventAnnotationGroupConfig;
        id: string;
    }, string>;
};
export declare const makeLensReducer: (storeDeps: LensStoreDeps) => import("redux-toolkit-v1/dist/createReducer").ReducerWithInitialState<LensAppState>;
declare function syncLinkedDimensions(state: LensAppState, visualizationMap: VisualizationMap, datasourceMap: DatasourceMap, _datasourceId?: string): {
    datasourceState: null;
    visualizationState: unknown;
    frame?: undefined;
} | {
    datasourceState: unknown;
    visualizationState: unknown;
    frame: {
        absDateRange: DateRange;
        now: number;
        dateRange: DateRange;
        query: Query | import("@kbn/es-query").AggregateQuery;
        filters: Filter[];
        projectRouting: import("@kbn/es-query").ProjectRouting;
        datasourceLayers: Partial<Record<string, import("@kbn/lens-common").DatasourcePublicAPI>>;
        activeData: TableInspectorAdapter | undefined;
        dataViews: DataViewsState;
    };
};
export {};
