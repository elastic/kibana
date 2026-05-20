import type { RuleTypeParams, Rule } from '@kbn/alerting-plugin/common';
import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils/constants';
export declare const ML_ALERT_TYPES: {
    readonly ANOMALY_DETECTION: "xpack.ml.anomaly_detection_alert";
    readonly AD_JOBS_HEALTH: "xpack.ml.anomaly_detection_jobs_health";
};
export type PreviewResultsKeys = 'record_results' | 'bucket_results' | 'influencer_results';
export type TopHitsResultsKeys = 'top_record_hits' | 'top_bucket_hits' | 'top_influencer_hits';
export interface AlertExecutionResult {
    count: number;
    key?: number;
    alertInstanceKey: string;
    isInterim: boolean;
    jobIds: string[];
    timestamp: number;
    timestampEpoch: number;
    timestampIso8601: string;
    score: number;
    bucketRange: {
        start: string;
        end: string;
    };
    topRecords: FormattedRecordAnomalyAlertDoc[];
    topInfluencers?: InfluencerAnomalyAlertDoc[];
    message: string;
}
export interface PreviewResponse {
    count: number;
    results: AlertExecutionResult[];
}
interface BaseAnomalyAlertDoc {
    result_type: MlAnomalyResultType;
    job_id: string;
    /**
     * Rounded score
     */
    score: number;
    timestamp: number;
    is_interim: boolean;
    unique_key: string;
}
export interface TopRecordAADDoc {
    job_id: string;
    record_score: number;
    initial_record_score: number;
    timestamp: number;
    is_interim: boolean;
    function: string;
    field_name?: string;
    by_field_name?: string;
    by_field_value?: string | number;
    over_field_name?: string;
    over_field_value?: string | number;
    partition_field_name?: string;
    partition_field_value?: string | number;
    typical: number[];
    actual: number[];
    detector_index: number;
}
export interface TopInfluencerAADDoc {
    job_id: string;
    influencer_score: number;
    initial_influencer_score: number;
    is_interim: boolean;
    timestamp: number;
    influencer_field_name: string;
    influencer_field_value: string | number;
}
export interface RecordAnomalyAlertDoc extends BaseAnomalyAlertDoc {
    result_type: typeof ML_ANOMALY_RESULT_TYPE.RECORD;
    function: string;
    field_name?: string;
    by_field_name?: string;
    by_field_value?: string | number;
    over_field_name?: string;
    over_field_value?: string | number;
    partition_field_name?: string;
    partition_field_value?: string | number;
    typical: number[];
    actual: number[];
}
export type FormattedRecordAnomalyAlertDoc = Omit<RecordAnomalyAlertDoc, 'typical' | 'actual'> & {
    typical: Array<string | number>;
    actual: Array<string | number>;
};
export interface BucketAnomalyAlertDoc extends BaseAnomalyAlertDoc {
    result_type: typeof ML_ANOMALY_RESULT_TYPE.BUCKET;
    start: number;
    end: number;
    timestamp_epoch: number;
    timestamp_iso8601: number;
}
export interface InfluencerAnomalyAlertDoc extends BaseAnomalyAlertDoc {
    result_type: typeof ML_ANOMALY_RESULT_TYPE.INFLUENCER;
    influencer_field_name: string;
    influencer_field_value: string | number;
    influencer_score: number;
}
export type AlertHitDoc = RecordAnomalyAlertDoc | BucketAnomalyAlertDoc | InfluencerAnomalyAlertDoc;
export declare function isRecordAnomalyAlertDoc(arg: any): arg is RecordAnomalyAlertDoc;
export declare function isBucketAnomalyAlertDoc(arg: any): arg is BucketAnomalyAlertDoc;
export declare function isInfluencerAnomalyAlertDoc(arg: any): arg is InfluencerAnomalyAlertDoc;
export type MlAnomalyDetectionAlertParams = {
    jobSelection: {
        jobIds?: string[];
        groupIds?: string[];
    };
    severity: number;
    resultType: MlAnomalyResultType;
    includeInterim: boolean;
    lookbackInterval: string | null | undefined;
    topNBuckets: number | null | undefined;
    kqlQueryString?: string | null;
} & RuleTypeParams;
export type MlAnomalyDetectionAlertAdvancedSettings = Pick<MlAnomalyDetectionAlertParams, 'lookbackInterval' | 'topNBuckets'>;
export type MlAnomalyDetectionAlertRule = Omit<Rule<MlAnomalyDetectionAlertParams>, 'apiKey'>;
export interface JobAlertingRuleStats {
    alerting_rules?: MlAnomalyDetectionAlertRule[];
}
export interface CommonHealthCheckConfig {
    enabled: boolean;
}
export type MlAnomalyDetectionJobsHealthRuleParams = {
    includeJobs: {
        jobIds?: string[];
        groupIds?: string[];
    };
    excludeJobs?: {
        jobIds?: string[];
        groupIds?: string[];
    } | null;
    testsConfig?: {
        datafeed?: CommonHealthCheckConfig | null;
        mml?: CommonHealthCheckConfig | null;
        delayedData?: (CommonHealthCheckConfig & {
            docsCount?: number | null;
            timeInterval?: string | null;
        }) | null;
        behindRealtime?: (CommonHealthCheckConfig & {
            timeInterval?: string | null;
        }) | null;
        errorMessages?: CommonHealthCheckConfig | null;
    } | null;
} & RuleTypeParams;
export type JobsHealthRuleTestsConfig = MlAnomalyDetectionJobsHealthRuleParams['testsConfig'];
export type JobsHealthTests = keyof Exclude<JobsHealthRuleTestsConfig, null | undefined>;
export {};
