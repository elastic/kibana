export declare const ALERTING_V2_ENABLED_SETTING_ID = "alerting:v2:enabled";
/**
 * Space-scoped. When Alerting v2 is enabled, controls whether the V1
 * Observability alerts table remains in solution navigation.
 */
export declare const ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID = "alerting:v1:showV1ObservabilityAlertsTable";
export declare const ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID = "alerting:v2:experimentalFeatures";
export interface AlertingAdvancedSettingValueMap {
    [ALERTING_V2_ENABLED_SETTING_ID]: boolean;
    [ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID]: boolean;
    [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: boolean;
}
export type AlertingAdvancedSettingId = keyof AlertingAdvancedSettingValueMap;
export type AlertingAdvancedSettingValue<K extends AlertingAdvancedSettingId> = AlertingAdvancedSettingValueMap[K];
