import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { MapStoreState } from '../reducers/store';
import { FLYOUT_STATE } from '../reducers/ui';
import { DRAW_MODE } from '../../common/constants';
export declare const UPDATE_FLYOUT = "UPDATE_FLYOUT";
export declare const SET_IS_LAYER_TOC_OPEN = "SET_IS_LAYER_TOC_OPEN";
export declare const SET_IS_TIME_SLIDER_OPEN = "SET_IS_TIME_SLIDER_OPEN";
export declare const SET_FULL_SCREEN = "SET_FULL_SCREEN";
export declare const SET_READ_ONLY = "SET_READ_ONLY";
export declare const SET_OPEN_TOC_DETAILS = "SET_OPEN_TOC_DETAILS";
export declare const SHOW_TOC_DETAILS = "SHOW_TOC_DETAILS";
export declare const HIDE_TOC_DETAILS = "HIDE_TOC_DETAILS";
export declare const SET_DRAW_MODE = "SET_DRAW_MODE";
export declare const SET_AUTO_OPEN_WIZARD_ID = "SET_AUTO_OPEN_WIZARD_ID";
export declare const PUSH_DELETED_FEATURE_ID = "PUSH_DELETED_FEATURE_ID";
export declare const CLEAR_DELETED_FEATURE_IDS = "CLEAR_DELETED_FEATURE_IDS";
export declare function exitFullScreen(): {
    type: string;
    isFullScreen: boolean;
};
export declare function updateFlyout(display: FLYOUT_STATE): {
    type: string;
    display: FLYOUT_STATE;
};
export declare function openMapSettings(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function setIsLayerTOCOpen(isLayerTOCOpen: boolean): {
    type: string;
    isLayerTOCOpen: boolean;
};
export declare function enableFullScreen(): {
    type: string;
    isFullScreen: boolean;
};
export declare function setReadOnly(isReadOnly: boolean): {
    type: string;
    isReadOnly: boolean;
};
export declare function setOpenTOCDetails(layerIds?: string[]): {
    type: string;
    layerIds: string[] | undefined;
};
export declare function showTOCDetails(layerId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function hideTOCDetails(layerId: string): {
    type: string;
    layerId: string;
};
export declare function setDrawMode(drawMode: DRAW_MODE): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function openTimeslider(): {
    type: string;
    isTimesliderOpen: boolean;
};
export declare function closeTimeslider(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function setAutoOpenLayerWizardId(autoOpenLayerWizardId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function pushDeletedFeatureId(featureId: string): {
    type: string;
    featureId: string;
};
export declare function clearDeletedFeatureIds(): {
    type: string;
};
