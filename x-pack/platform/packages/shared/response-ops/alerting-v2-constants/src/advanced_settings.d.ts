export declare const ALERTING_V2_ENABLED_SETTING_ID = "alerting:v2:enabled";
export interface AlertingAdvancedSettingValueMap {
    [ALERTING_V2_ENABLED_SETTING_ID]: boolean;
}
export type AlertingAdvancedSettingId = keyof AlertingAdvancedSettingValueMap;
export type AlertingAdvancedSettingValue<K extends AlertingAdvancedSettingId> = AlertingAdvancedSettingValueMap[K];
