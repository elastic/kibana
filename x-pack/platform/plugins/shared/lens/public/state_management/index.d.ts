import { type PreloadedState, type Action, type Dispatch, type MiddlewareAPI } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import type { LensState, LensStoreDeps } from '@kbn/lens-common';
export * from './selectors';
export { getUpdatedFrameWithDatasourceState } from './utils';
export declare const loadInitial: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./lens_slice").InitialAppState, string>, initEmpty: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[{
    newState: Partial<import("@kbn/lens-common").LensAppState>;
    initialContext?: import("@kbn/ui-actions-plugin/public").VisualizeFieldContext | import("@kbn/lens-common").VisualizeEditorContext;
}], {
    layerId: string;
    newState: Partial<import("@kbn/lens-common").LensAppState>;
    initialContext: import("@kbn/ui-actions-plugin/public").VisualizeFieldContext | import("@kbn/lens-common").VisualizeEditorContext | undefined;
}, "initEmpty", never, never>, initExisting: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<import("@kbn/lens-common").LensAppState>, string>, navigateAway: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>, setExecutionContext: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./lens_slice").SetExecutionContextPayload, string>, setState: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<import("@kbn/lens-common").LensAppState>, string>, enableAutoApply: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>, disableAutoApply: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>, applyChanges: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>, setSaveable: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>, onActiveDataChange: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    activeData: import("@kbn/lens-common").TableInspectorAdapter;
}, string>, updateDatasourceState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newDatasourceState: unknown;
    datasourceId: string;
    clearStagedPreview?: boolean;
    dontSyncLinkedDimensions?: boolean;
}, string>, updateVisualizationState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    newState: unknown;
    dontSyncLinkedDimensions?: boolean;
}, string>, insertLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    datasourceId: string;
}, string>, switchVisualization: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    suggestion: {
        newVisualizationId: string;
        visualizationState: unknown;
        datasourceState?: unknown;
        datasourceId?: string;
    };
    clearStagedPreview?: boolean;
}, string>, rollbackSuggestion: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>, submitSuggestion: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>, switchDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newDatasourceId: string;
}, string>, switchAndCleanDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newDatasourceId: string;
    visualizationId: string | null;
    currentIndexPatternId?: string;
}, string>, updateIndexPatterns: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<import("@kbn/lens-common").DataViewsState>, string>, setToggleFullscreen: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>, editVisualizationAction: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    event: import("@kbn/lens-common").LensEditEvent<keyof import("@kbn/lens-common").LensEditContextMapping>;
}, string>, removeLayers: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: import("@kbn/lens-common").VisualizationState["activeId"];
    layerIds: string[];
}, string>, removeOrClearLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    layerId: string;
    layerIds: string[];
}, string>, setSelectedLayerId: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string | null;
}, string>, cloneLayer: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[{
    layerId: string;
}], {
    newLayerId: string;
    layerId: string;
}, "cloneLayer", never, never>, addLayer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    layerType: import("@kbn/lens-common").LensLayerType;
    extraArg: unknown;
    ignoreInitialValues?: boolean;
    seriesType?: import("@kbn/lens-common").SeriesType;
}, string>, onDropToDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    source: import("@kbn/dom-drag-drop").DragDropIdentifier;
    target: import("@kbn/lens-common").DragDropOperation;
    dropType: import("@kbn/dom-drag-drop").DropType;
}, string>, setDimensionAndUpdateDatasource: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationId: string;
    datasourceId: string;
    newDatasourceState: unknown;
    layerId: string;
    groupId: string;
    columnId: string;
}, string>, setLayerDefaultDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    groupId: string;
}, string>, removeDimension: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    datasourceId?: string;
}, string>, setIsLoadLibraryVisible: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, string>, registerLibraryAnnotationGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    group: import("@kbn/event-annotation-common").EventAnnotationGroupConfig;
    id: string;
}, string>, changeIndexPattern: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visualizationIds?: string[];
    datasourceIds?: string[];
    indexPatternId: string;
    layerId?: string;
    dataViews: Partial<import("@kbn/lens-common").DataViewsState>;
}, string>;
type CustomMiddleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => void;
export declare const makeConfigureStore: (storeDeps: LensStoreDeps, preloadedState?: PreloadedState<LensState> | undefined, customMiddleware?: CustomMiddleware) => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<{
    lens: import("@kbn/lens-common").LensAppState;
}, import("redux").AnyAction, (((store: MiddlewareAPI) => (next: Dispatch) => (action: import("@reduxjs/toolkit").PayloadAction) => Promise<void> | undefined) | ((store: MiddlewareAPI) => (next: Dispatch) => (action: import("@reduxjs/toolkit").PayloadAction<unknown>) => void))[]>;
export type LensRootStore = ReturnType<typeof makeConfigureStore>;
export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;
export declare const useLensDispatch: () => Dispatch<import("redux").AnyAction>;
export declare const useLensSelector: TypedUseSelectorHook<LensRootState>;
