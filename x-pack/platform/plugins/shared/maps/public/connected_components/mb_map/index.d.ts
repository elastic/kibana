import { MbMap } from './mb_map';
declare const connected: import("react-redux").ConnectedComponent<typeof MbMap, import("react-redux").Omit<import("react").ClassAttributes<MbMap> & import("./mb_map").Props, "settings" | "inspectorAdapters" | "isFullScreen" | "timeslice" | "customIcons" | "layerList" | "filterModeActive" | "isMapReady" | "spatialFiltersLayer" | "goto" | "extentChanged" | "onMapReady" | "onMapDestroyed" | "setMouseCoordinates" | "clearMouseCoordinates" | "clearGoto" | "setMapInitError" | "featureModeActive" | "onMapMove">>;
export { connected as MBMap };
