import { MapSettingsPanel } from './map_settings_panel';
declare const connectedMapSettingsPanel: import("react-redux").ConnectedComponent<typeof MapSettingsPanel, import("react-redux").Omit<import("./map_settings_panel").Props, "settings" | "center" | "zoom" | "customIcons" | "updateCustomIcons" | "updateMapSetting" | "deleteCustomIcon" | "cancelChanges" | "hasMapSettingsChanges" | "keepChanges">>;
export { connectedMapSettingsPanel as MapSettingsPanel };
