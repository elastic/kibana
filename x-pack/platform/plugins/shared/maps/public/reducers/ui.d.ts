import { DRAW_MODE } from '../../common/constants';
export declare enum FLYOUT_STATE {
    NONE = "NONE",
    LAYER_PANEL = "LAYER_PANEL",
    ADD_LAYER_WIZARD = "ADD_LAYER_WIZARD",
    MAP_SETTINGS_PANEL = "MAP_SETTINGS_PANEL"
}
export type MapUiState = {
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
};
export declare const DEFAULT_IS_LAYER_TOC_OPEN = true;
export declare const DEFAULT_MAP_UI_STATE: {
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: never[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: never[];
};
export declare function ui(state: MapUiState | undefined, action: any): {
    flyoutDisplay: any;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
} | {
    drawMode: any;
    flyoutDisplay: FLYOUT_STATE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
} | {
    isLayerTOCOpen: any;
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
} | {
    isTimesliderOpen: any;
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
} | {
    isFullScreen: any;
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
} | {
    isReadOnly: any;
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
} | {
    openTOCDetails: any;
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    autoOpenLayerWizardId: string;
    deletedFeatureIds: string[];
} | {
    autoOpenLayerWizardId: any;
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    deletedFeatureIds: string[];
} | {
    deletedFeatureIds: any[];
    flyoutDisplay: FLYOUT_STATE;
    drawMode: DRAW_MODE;
    isFullScreen: boolean;
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    isTimesliderOpen: boolean;
    openTOCDetails: string[];
    autoOpenLayerWizardId: string;
};
