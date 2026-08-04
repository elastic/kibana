import { MapSettingsPanel } from './map_settings_panel';
declare const connectedMapSettingsPanel: import("react-redux-v7").ConnectedComponent<typeof MapSettingsPanel, import("react-redux-v7").Omit<import("./map_settings_panel").Props, "center" | "settings" | "zoom" | "customIcons" | "updateCustomIcons" | "updateMapSetting" | "deleteCustomIcon" | "cancelChanges" | "hasMapSettingsChanges" | "keepChanges">>;
export { connectedMapSettingsPanel as MapSettingsPanel };
