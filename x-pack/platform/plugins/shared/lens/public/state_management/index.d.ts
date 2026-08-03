import { type PreloadedState, type Action, type Dispatch, type MiddlewareAPI } from 'redux-toolkit-v1';
import type { TypedUseSelectorHook } from 'react-redux-v7';
import type { LensState, LensStoreDeps } from '@kbn/lens-common';
export * from './selectors';
export { getUpdatedFrameWithDatasourceState } from './utils';
export declare const loadInitial: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./lens_slice").InitialAppState, string>, initEmpty: import("redux-toolkit-v1").ActionCreatorWithPreparedPayload<[{
    newState: Partial<import("@kbn/lens-common").LensAppState>;
    initialContext?: import("@kbn/ui-actions-plugin/public").VisualizeFieldContext | import("@kbn/lens-common").VisualizeEditorContext;
}], {
    layerId: string;
    newState: Partial<import("@kbn/lens-common").LensAppState>;
    initialContext: import("@kbn/ui-actions-plugin/public").VisualizeFieldContext | import("@kbn/lens-common").VisualizeEditorContext | undefined;
}, "initEmpty", never, never>, initExisting: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<import("@kbn/lens-common").LensAppState>, string>, navigateAway: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>, setExecutionContext: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./lens_slice").SetExecutionContextPayload, string>, setState: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<import("@kbn/lens-common").LensAppState>, string>, enableAutoApply: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>, disableAutoApply: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>, applyChanges: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>, setSaveable: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>, onActiveDataChange: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    activeData: import("@kbn/lens-common").TableInspectorAdapter;
}, string>, updateDatasourceState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    newDatasourceState: unknown;
    datasourceId: string;
    clearStagedPreview?: boolean;
    dontSyncLinkedDimensions?: boolean;
}, string>, updateVisualizationState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    newState: unknown;
    dontSyncLinkedDimensions?: boolean;
}, string>, insertLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    datasourceId: string;
}, string>, switchVisualization: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    suggestion: {
        newVisualizationId: string;
        visualizationState: unknown;
        datasourceState?: unknown;
        datasourceId?: string;
    };
    clearStagedPreview?: boolean;
}, string>, rollbackSuggestion: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>, submitSuggestion: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>, switchDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    newDatasourceId: string;
}, string>, switchAndCleanDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    newDatasourceId: string;
    visualizationId: string | null;
    currentIndexPatternId?: string;
}, string>, updateIndexPatterns: import("redux-toolkit-v1").ActionCreatorWithPayload<Partial<import("@kbn/lens-common").DataViewsState>, string>, setToggleFullscreen: import("redux-toolkit-v1").ActionCreatorWithoutPayload<string>, editVisualizationAction: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    event: import("@kbn/lens-common").LensEditEvent<keyof import("@kbn/lens-common").LensEditContextMapping>;
}, string>, removeLayers: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: import("@kbn/lens-common").VisualizationState["activeId"];
    layerIds: string[];
}, string>, removeOrClearLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    layerId: string;
    layerIds: string[];
}, string>, setSelectedLayerId: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string | null;
}, string>, cloneLayer: import("redux-toolkit-v1").ActionCreatorWithPreparedPayload<[{
    layerId: string;
}], {
    newLayerId: string;
    layerId: string;
}, "cloneLayer", never, never>, addLayer: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    layerType: import("@kbn/lens-common").LensLayerType;
    extraArg: unknown;
    ignoreInitialValues?: boolean;
    seriesType?: import("@kbn/lens-common").SeriesType;
}, string>, onDropToDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    source: import("@kbn/dom-drag-drop").DragDropIdentifier;
    target: import("@kbn/lens-common").DragDropOperation;
    dropType: import("@kbn/dom-drag-drop").DropType;
}, string>, setDimensionAndUpdateDatasource: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationId: string;
    datasourceId: string;
    newDatasourceState: unknown;
    layerId: string;
    groupId: string;
    columnId: string;
}, string>, setLayerDefaultDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    groupId: string;
}, string>, removeDimension: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    layerId: string;
    columnId: string;
    datasourceId?: string;
}, string>, setIsLoadLibraryVisible: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, string>, registerLibraryAnnotationGroup: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    group: import("@kbn/event-annotation-common").EventAnnotationGroupConfig;
    id: string;
}, string>, changeIndexPattern: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    visualizationIds?: string[];
    datasourceIds?: string[];
    indexPatternId: string;
    layerId?: string;
    dataViews: Partial<import("@kbn/lens-common").DataViewsState>;
}, string>;
type CustomMiddleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => void;
export declare const makeConfigureStore: (storeDeps: LensStoreDeps, preloadedState?: PreloadedState<LensState> | undefined, customMiddleware?: CustomMiddleware) => import("redux-toolkit-v1/dist/configureStore").ToolkitStore<{
    lens: import("@kbn/lens-common").LensAppState;
}, import("redux-v4").AnyAction, (((store: MiddlewareAPI) => (next: Dispatch) => (action: import("redux-toolkit-v1").PayloadAction) => Promise<void> | undefined) | ((store: MiddlewareAPI) => (next: Dispatch) => (action: import("redux-toolkit-v1").PayloadAction<unknown>) => void))[]>;
export type LensRootStore = ReturnType<typeof makeConfigureStore>;
export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;
export declare const useLensDispatch: () => Dispatch<import("redux-v4").AnyAction>;
export declare const useLensSelector: TypedUseSelectorHook<LensRootState>;
