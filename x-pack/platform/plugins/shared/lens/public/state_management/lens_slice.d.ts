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
export declare const setState: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<LensAppState>, string>;
export declare const setExecutionContext: import("@reduxjs/toolkit").ActionCreatorWithPayload<SetExecutionContextPayload, string>;
export declare const initExisting: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<LensAppState>, string>;
export declare const onActiveDataChange: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    activeData: TableInspectorAdapter;
}, string>;
export declare const setSaveable: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>;
export declare const enableAutoApply: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export declare const disableAutoApply: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export declare const applyChanges: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export declare const setChangesApplied: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>;
export declare const updateDatasourceState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newDatasourceState: unknown;
    datasourceId: string;
    clearStagedPreview?: boolean;
    dontSyncLinkedDimensions?: boolean;
}, string>;
export declare const updateVisualizationState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    newState: unknown;
    dontSyncLinkedDimensions?: boolean;
}, string>;
export declare const insertLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    datasourceId: string;
}, string>;
export declare const switchVisualization: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    suggestion: {
        newVisualizationId: string;
        visualizationState: unknown;
        datasourceState?: unknown;
        datasourceId?: string;
    };
    clearStagedPreview?: boolean;
}, string>;
export declare const rollbackSuggestion: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export declare const setToggleFullscreen: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export declare const setIsLoadLibraryVisible: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>;
export declare const submitSuggestion: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export declare const switchDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newDatasourceId: string;
}, string>;
export declare const switchAndCleanDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newDatasourceId: string;
    visualizationId: string | null;
    currentIndexPatternId?: string;
}, string>;
export declare const navigateAway: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export declare const loadInitial: import("@reduxjs/toolkit").ActionCreatorWithPayload<InitialAppState, string>;
export declare const initEmpty: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[{
    newState: Partial<LensAppState>;
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}], {
    layerId: string;
    newState: Partial<LensAppState>;
    initialContext: VisualizeFieldContext | VisualizeEditorContext | undefined;
}, "initEmpty", never, never>;
export declare const editVisualizationAction: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    event: LensEditEvent<keyof LensEditContextMapping>;
}, string>;
export declare const removeLayers: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: VisualizationState["activeId"];
    layerIds: string[];
}, string>;
export declare const removeOrClearLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    layerId: string;
    layerIds: string[];
}, string>;
export declare const setSelectedLayerId: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string | null;
}, string>;
export declare const cloneLayer: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[{
    layerId: string;
}], {
    newLayerId: string;
    layerId: string;
}, "cloneLayer", never, never>;
export declare const addLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    layerType: LayerType;
    extraArg: unknown;
    ignoreInitialValues?: boolean;
    seriesType?: SeriesType;
}, string>;
export declare const onDropToDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    source: DragDropIdentifier;
    target: DragDropOperation;
    dropType: DropType;
}, string>;
export declare const setLayerDefaultDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    groupId: string;
}, string>;
export declare const setDimensionAndUpdateDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    datasourceId: string;
    newDatasourceState: unknown;
    layerId: string;
    groupId: string;
    columnId: string;
}, string>;
export declare const updateIndexPatterns: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<DataViewsState>, string>;
export declare const replaceIndexpattern: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newIndexPattern: IndexPattern;
    oldId: string;
}, string>;
export declare const changeIndexPattern: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationIds?: string[];
    datasourceIds?: string[];
    indexPatternId: string;
    layerId?: string;
    dataViews: Partial<DataViewsState>;
}, string>;
export declare const removeDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    datasourceId?: string;
}, string>;
export declare const registerLibraryAnnotationGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    group: EventAnnotationGroupConfig;
    id: string;
}, string>;
export declare const lensActions: {
    initExisting: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<LensAppState>, string>;
    setState: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<LensAppState>, string>;
    setExecutionContext: import("@reduxjs/toolkit").ActionCreatorWithPayload<SetExecutionContextPayload, string>;
    onActiveDataChange: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        activeData: TableInspectorAdapter;
    }, string>;
    setSaveable: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>;
    enableAutoApply: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
    disableAutoApply: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
    applyChanges: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
    setChangesApplied: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>;
    updateDatasourceState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        newDatasourceState: unknown;
        datasourceId: string;
        clearStagedPreview?: boolean;
        dontSyncLinkedDimensions?: boolean;
    }, string>;
    updateVisualizationState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        visualizationId: string;
        newState: unknown;
        dontSyncLinkedDimensions?: boolean;
    }, string>;
    insertLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        layerId: string;
        datasourceId: string;
    }, string>;
    switchVisualization: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        suggestion: {
            newVisualizationId: string;
            visualizationState: unknown;
            datasourceState?: unknown;
            datasourceId?: string;
        };
        clearStagedPreview?: boolean;
    }, string>;
    rollbackSuggestion: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
    setToggleFullscreen: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
    setIsLoadLibraryVisible: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>;
    submitSuggestion: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
    switchDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        newDatasourceId: string;
    }, string>;
    switchAndCleanDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        newDatasourceId: string;
        visualizationId: string | null;
        currentIndexPatternId?: string;
    }, string>;
    navigateAway: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
    loadInitial: import("@reduxjs/toolkit").ActionCreatorWithPayload<InitialAppState, string>;
    initEmpty: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[{
        newState: Partial<LensAppState>;
        initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    }], {
        layerId: string;
        newState: Partial<LensAppState>;
        initialContext: VisualizeFieldContext | VisualizeEditorContext | undefined;
    }, "initEmpty", never, never>;
    editVisualizationAction: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        visualizationId: string;
        event: LensEditEvent<keyof LensEditContextMapping>;
    }, string>;
    removeLayers: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        visualizationId: VisualizationState["activeId"];
        layerIds: string[];
    }, string>;
    removeOrClearLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        visualizationId: string;
        layerId: string;
        layerIds: string[];
    }, string>;
    setSelectedLayerId: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        layerId: string | null;
    }, string>;
    addLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        layerId: string;
        layerType: LayerType;
        extraArg: unknown;
        ignoreInitialValues?: boolean;
        seriesType?: SeriesType;
    }, string>;
    onDropToDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        source: DragDropIdentifier;
        target: DragDropOperation;
        dropType: DropType;
    }, string>;
    setDimensionAndUpdateDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        visualizationId: string;
        datasourceId: string;
        newDatasourceState: unknown;
        layerId: string;
        groupId: string;
        columnId: string;
    }, string>;
    cloneLayer: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[{
        layerId: string;
    }], {
        newLayerId: string;
        layerId: string;
    }, "cloneLayer", never, never>;
    setLayerDefaultDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        layerId: string;
        columnId: string;
        groupId: string;
    }, string>;
    updateIndexPatterns: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<DataViewsState>, string>;
    replaceIndexpattern: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        newIndexPattern: IndexPattern;
        oldId: string;
    }, string>;
    changeIndexPattern: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        visualizationIds?: string[];
        datasourceIds?: string[];
        indexPatternId: string;
        layerId?: string;
        dataViews: Partial<DataViewsState>;
    }, string>;
    removeDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        layerId: string;
        columnId: string;
        datasourceId?: string;
    }, string>;
    syncLinkedDimensions: typeof syncLinkedDimensions;
    registerLibraryAnnotationGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        group: EventAnnotationGroupConfig;
        id: string;
    }, string>;
};
export declare const makeLensReducer: (storeDeps: LensStoreDeps) => import("@reduxjs/toolkit/dist/createReducer").ReducerWithInitialState<LensAppState>;
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
