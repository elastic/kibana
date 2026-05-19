import type { JobsHealthTests } from '@kbn/ml-common-types/alerts';
export declare const ML_ALERT_TYPES: {
    readonly ANOMALY_DETECTION: "xpack.ml.anomaly_detection_alert";
    readonly AD_JOBS_HEALTH: "xpack.ml.anomaly_detection_jobs_health";
};
export declare const ML_RULE_TYPE_IDS: ("xpack.ml.anomaly_detection_alert" | "xpack.ml.anomaly_detection_jobs_health")[];
export declare const ML_VALID_CONSUMERS: ("ml" | "alerts" | "stackAlerts")[];
export type MlAlertType = (typeof ML_ALERT_TYPES)[keyof typeof ML_ALERT_TYPES];
export declare const ALERT_PREVIEW_SAMPLE_SIZE = 5;
export declare const TOP_N_BUCKETS_COUNT = 1;
export declare const ALL_JOBS_SELECTION = "*";
export declare const HEALTH_CHECK_NAMES: Record<JobsHealthTests, {
    name: string;
    description: string;
}>;
export declare const ALERT_ANOMALY_TIMESTAMP: "kibana.alert.anomaly_timestamp";
export declare const ALERT_ANOMALY_DETECTION_JOB_ID: "kibana.alert.job_id";
export declare const ALERT_ANOMALY_SCORE: "kibana.alert.anomaly_score";
export declare const ALERT_ANOMALY_IS_INTERIM: "kibana.alert.is_interim";
export declare const ALERT_TOP_RECORDS: "kibana.alert.top_records";
export declare const ALERT_TOP_INFLUENCERS: "kibana.alert.top_influencers";
export declare const ANOMALY_RESULT_TYPE_SCORE_FIELDS: {
    readonly bucket: "anomaly_score";
    readonly record: "record_score";
    readonly influencer: "influencer_score";
};
export declare const ALERT_MML_RESULTS: "kibana.alert.mml_results";
export declare const ALERT_DATAFEED_RESULTS: "kibana.alert.datafeed_results";
export declare const ALERT_DELAYED_DATA_RESULTS: "kibana.alert.delayed_data_results";
export declare const ALERT_JOB_ERRORS_RESULTS: "kibana.alert.job_errors_results";
export declare const alertFieldNameMap: Readonly<Record<string, string>>;
