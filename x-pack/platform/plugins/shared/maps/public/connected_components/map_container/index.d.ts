import { MapContainer } from './map_container';
declare const connected: import("react-redux").ConnectedComponent<typeof MapContainer, import("react-redux").Omit<import("react").ClassAttributes<MapContainer> & import("./map_container").Props, "settings" | "indexPatternIds" | "layerList" | "isTimesliderOpen" | "isFullScreen" | "isMapLoading" | "cancelAllInFlightRequests" | "exitFullScreen" | "flyoutDisplay" | "mapInitError">>;
export { connected as MapContainer };
