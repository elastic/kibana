import { LayerControl } from './layer_control';
declare const connected: import("react-redux").ConnectedComponent<typeof LayerControl, import("react-redux").Omit<import("./layer_control").Props, "zoom" | "isReadOnly" | "isFlyoutOpen" | "isLayerTOCOpen" | "layerList" | "showAddLayerWizard" | "closeLayerTOC" | "openLayerTOC" | "hideAllLayers" | "showAllLayers">>;
export { connected as LayerControl };
