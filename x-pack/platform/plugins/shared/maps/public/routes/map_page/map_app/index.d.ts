import { MapApp } from './map_app';
declare const connectedComponent: import("react-redux").ConnectedComponent<typeof MapApp, import("react-redux").Omit<import("react").ClassAttributes<MapApp> & import("./map_app").Props, "query" | "inspectorAdapters" | "filters" | "setQuery" | "isSaveDisabled" | "setExecutionContext" | "timeFilters" | "isFullScreen" | "isOpenSettingsDisabled" | "enableFullScreen" | "openMapSettings" | "nextIndexPatternIds">>;
export { connectedComponent as MapApp };
