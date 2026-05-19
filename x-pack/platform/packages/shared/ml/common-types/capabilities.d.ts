import type { KibanaRequest } from '@kbn/core/server';
export declare const apmUserMlCapabilities: {
    canGetJobs: boolean;
};
export declare const featureMlCapabilities: {
    isADEnabled: boolean;
    isDFAEnabled: boolean;
    isNLPEnabled: boolean;
};
export declare const userMlCapabilities: {
    canGetJobs: boolean;
    canGetDatafeeds: boolean;
    canGetCalendars: boolean;
    canFindFileStructure: boolean;
    canGetDataFrameAnalytics: boolean;
    canGetAnnotations: boolean;
    canCreateAnnotation: boolean;
    canDeleteAnnotation: boolean;
    canUseMlAlerts: boolean;
    canGetTrainedModels: boolean;
    canTestTrainedModels: boolean;
    canGetFieldInfo: boolean;
    canGetMlInfo: boolean;
    canUseAiops: boolean;
};
export declare const adminMlCapabilities: {
    canCreateJob: boolean;
    canDeleteJob: boolean;
    canOpenJob: boolean;
    canCloseJob: boolean;
    canResetJob: boolean;
    canUpdateJob: boolean;
    canForecastJob: boolean;
    canDeleteForecast: boolean;
    canCreateDatafeed: boolean;
    canDeleteDatafeed: boolean;
    canStartStopDatafeed: boolean;
    canUpdateDatafeed: boolean;
    canPreviewDatafeed: boolean;
    canGetFilters: boolean;
    canCreateCalendar: boolean;
    canDeleteCalendar: boolean;
    canCreateFilter: boolean;
    canDeleteFilter: boolean;
    canCreateDataFrameAnalytics: boolean;
    canDeleteDataFrameAnalytics: boolean;
    canStartStopDataFrameAnalytics: boolean;
    canCreateMlAlerts: boolean;
    canUseMlAlerts: boolean;
    canViewMlNodes: boolean;
    canCreateTrainedModels: boolean;
    canDeleteTrainedModels: boolean;
    canStartStopTrainedModels: boolean;
    canCreateInferenceEndpoint: boolean;
};
export type FeatureMlCapabilities = typeof featureMlCapabilities;
export type UserMlCapabilities = typeof userMlCapabilities;
export type AdminMlCapabilities = typeof adminMlCapabilities;
export type MlCapabilities = FeatureMlCapabilities & UserMlCapabilities & AdminMlCapabilities;
export type MlCapabilitiesKey = keyof MlCapabilities;
export declare const basicLicenseMlCapabilities: MlCapabilitiesKey[];
export declare function getDefaultMlCapabilities(): MlCapabilities;
export declare const alertingFeatures: {
    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
    consumers: string[];
}[];
export declare function getPluginPrivileges(): {
    admin: {
        api: string[];
        catalogue: string[];
        ui: string[];
        savedObject: {
            all: string[];
            read: string[];
        };
        alerting: {
            rule: {
                all: {
                    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
                    consumers: string[];
                }[];
                enable: {
                    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
                    consumers: string[];
                }[];
                manual_run: {
                    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
                    consumers: string[];
                }[];
                manage_rule_settings: {
                    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
                    consumers: string[];
                }[];
            };
            alert: {
                all: {
                    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
                    consumers: string[];
                }[];
            };
        };
        app: string[];
        excludeFromBasePrivileges: boolean;
        management: {
            insightsAndAlerting: string[];
        };
    };
    user: {
        api: string[];
        catalogue: string[];
        management: {
            insightsAndAlerting: string[];
        };
        ui: string[];
        savedObject: {
            all: never[];
            read: string[];
        };
        alerting: {
            rule: {
                read: {
                    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
                    consumers: string[];
                }[];
            };
            alert: {
                read: {
                    ruleTypeId: "xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health";
                    consumers: string[];
                }[];
            };
        };
        app: string[];
        excludeFromBasePrivileges: boolean;
    };
    apmUser: {
        excludeFromBasePrivileges: boolean;
        app: never[];
        catalogue: never[];
        savedObject: {
            all: never[];
            read: string[];
        };
        api: string[];
        ui: string[];
    };
};
export interface MlCapabilitiesResponse {
    capabilities: MlCapabilities;
    upgradeInProgress: boolean;
    isPlatinumOrTrialLicense: boolean;
    mlFeatureEnabledInSpace: boolean;
}
export type ResolveMlCapabilities = (request: KibanaRequest) => Promise<MlCapabilities | null>;
interface FeatureCapabilities {
    ad: MlCapabilitiesKey[];
    dfa: MlCapabilitiesKey[];
    nlp: MlCapabilitiesKey[];
}
export declare const featureCapabilities: FeatureCapabilities;
export {};
