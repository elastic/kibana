import type { AnyAction, Dispatch } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { Query } from '@kbn/es-query';
import type { MapStoreState } from '../reducers/store';
import type { Attribution, JoinDescriptor, LayerDescriptor, StyleDescriptor, TileError, TileMetaFeature } from '../../common/descriptor_types';
import type { ILayer } from '../classes/layers/layer';
import type { OnSourceChangeArgs } from '../classes/sources/source';
import type { LAYER_TYPE } from '../../common/constants';
export declare function trackCurrentLayerState(layerId: string): {
    type: string;
    layerId: string;
};
export declare function rollbackToTrackedLayerStateForSelectedLayer(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function removeTrackedLayerStateForSelectedLayer(): (dispatch: Dispatch, getState: () => MapStoreState) => void;
export declare function replaceLayerList(newLayerList: LayerDescriptor[]): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function updateLayerDescriptor(layerDescriptor: LayerDescriptor): {
    type: string;
    layer: LayerDescriptor;
};
export declare function cloneLayer(layerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function addLayer(layerDescriptor: LayerDescriptor): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function addLayerWithoutDataSync(layerDescriptor: LayerDescriptor): {
    type: string;
    layer: LayerDescriptor;
};
export declare function addPreviewLayers(layerDescriptors: LayerDescriptor[]): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function removePreviewLayers(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function promotePreviewLayers(): (dispatch: Dispatch, getState: () => MapStoreState) => void;
export declare function setLayerVisibility(layerId: string, makeVisible: boolean): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function toggleLayerVisible(layerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function hideAllLayers(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function showAllLayers(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function showThisLayerOnly(layerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function setSelectedLayer(layerId: string | null): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function setFirstPreviewLayerToSelectedLayer(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function updateLayerOrder(newLayerOrder: number[]): {
    type: string;
    newLayerOrder: number[];
};
export declare function updateSourceProp(layerId: string, propName: string, value: unknown, newLayerType?: LAYER_TYPE): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => Promise<void>;
export declare function updateSourceProps(layerId: string, sourcePropChanges: OnSourceChangeArgs[]): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => Promise<void>;
export declare function updateLayerLabel(id: string, newLabel: string): {
    type: string;
    id: string;
    propName: string;
    newValue: string;
};
export declare function updateLayerLocale(id: string, locale: string): {
    type: string;
    id: string;
    propName: string;
    newValue: string;
};
export declare function setLayerAttribution(id: string, attribution: Attribution): {
    type: string;
    id: string;
    propName: string;
    newValue: Readonly<{} & {
        url: string;
        label: string;
    }>;
};
export declare function clearLayerAttribution(id: string): {
    type: string;
    id: string;
    propName: string;
};
export declare function updateLayerMinZoom(id: string, minZoom: number): {
    type: string;
    id: string;
    propName: string;
    newValue: number;
};
export declare function updateLayerMaxZoom(id: string, maxZoom: number): {
    type: string;
    id: string;
    propName: string;
    newValue: number;
};
export declare function updateLayerAlpha(id: string, alpha: number): {
    type: string;
    id: string;
    propName: string;
    newValue: number;
};
export declare function updateLabelsOnTop(id: string, areLabelsOnTop: boolean): {
    type: string;
    id: string;
    propName: string;
    newValue: boolean;
};
export declare function updateFittableFlag(id: string, includeInFitToBounds: boolean): {
    type: string;
    id: string;
    propName: string;
    newValue: boolean;
};
export declare function updateDisableTooltips(id: string, disableTooltips: boolean): {
    type: string;
    id: string;
    propName: string;
    newValue: boolean;
};
export declare function setLayerQuery(id: string, query: Query): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function setLayerParent(id: string, parent: string | undefined): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function removeSelectedLayer(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function removeLayer(layerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function updateLayerStyle(layerId: string, styleDescriptor: StyleDescriptor): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function updateLayerStyleForSelectedLayer(styleDescriptor: StyleDescriptor): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function setJoinsForLayer(layer: ILayer, joins: Array<Partial<JoinDescriptor>>): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => Promise<void>;
export declare function setHiddenLayers(hiddenLayerIds: string[]): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function setTileState(layerId: string, areTilesLoaded: boolean, tileMetaFeatures?: TileMetaFeature[], tileErrors?: TileError[]): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function createLayerGroup(draggedLayerId: string, combineLayerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function ungroupLayer(layerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function moveLayerToLeftOfTarget(moveLayerId: string, targetLayerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function moveLayerToBottom(moveLayerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
