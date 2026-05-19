export declare const PLUGIN_ID = "ml";
export declare const PLUGIN_ICON = "machineLearningApp";
export declare const PLUGIN_ICON_SOLUTION = "logoKibana";
export declare const ML_APP_NAME: string;
export declare const ML_APP_ROUTE = "/app/ml";
export declare const ML_MANAGEMENT_APP_ROUTE = "/app/management/ml";
export declare const ML_INTERNAL_BASE_PATH = "/internal/ml";
export declare const ML_EXTERNAL_BASE_PATH = "/api/ml";
export type MlFeatures = Record<'ad' | 'dfa' | 'nlp', boolean>;
export type CompatibleModule = 'security' | 'observability' | 'search';
export type ExperimentalFeatures = Record<'ruleFormV2', boolean>;
export interface ModelDeploymentSettings {
    allowStaticAllocations: boolean;
    vCPURange: Record<'low' | 'medium' | 'high', {
        min: number;
        max: number;
        static?: number;
        maxThreads: number;
    }>;
}
export interface NLPSettings {
    modelDeployment?: ModelDeploymentSettings;
}
export interface ConfigSchema {
    ad?: {
        enabled: boolean;
    };
    dfa?: {
        enabled: boolean;
    };
    nlp?: {
        enabled: boolean;
        modelDeployment?: ModelDeploymentSettings;
    };
    compatibleModuleType?: CompatibleModule;
    experimental?: {
        ruleFormV2?: {
            enabled: boolean;
        };
    };
}
export declare function initEnabledFeatures(enabledFeatures: MlFeatures, config: ConfigSchema): void;
export declare function initExperimentalFeatures(experimentalFeatures: ExperimentalFeatures, config: ConfigSchema): void;
export declare function initModelDeploymentSettings(nlpSettings: NLPSettings, config: ConfigSchema): void;
