export declare const APM_INDEX_PATTERN_MAX_LENGTH = 2048;
export declare const APM_INDEX_SETTING_KEYS: readonly ["transaction", "span", "error", "metric", "onboarding", "sourcemap"];
export type ApmIndexSettingKey = (typeof APM_INDEX_SETTING_KEYS)[number];
export interface ApmIndexValidationIssue {
    code: 'maxLength';
    maxLength: number;
}
export type ApmIndexValidationErrors = Partial<Record<ApmIndexSettingKey, ApmIndexValidationIssue>>;
export type ApmIndexValidationValues = Partial<Record<ApmIndexSettingKey, string | undefined>>;
export declare function validateApmIndexSetting(setting: ApmIndexSettingKey, value?: string): ApmIndexValidationIssue | undefined;
export declare function validateApmIndices(values: ApmIndexValidationValues): ApmIndexValidationErrors;
