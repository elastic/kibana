import type { ByteSize, DateTime, MlDatafeedState, MlJobState, MlJobStats } from '@elastic/elasticsearch/lib/api/types';
import type { ActionGroup, AlertInstanceContext } from '@kbn/alerting-plugin/common';
import type { RuleExecutorOptions, IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import type { MlAnomalyDetectionHealthAlert } from '@kbn/alerts-as-data-utils';
import type { ALERT_REASON } from '@kbn/rule-data-utils';
import type { JobMessage } from '@kbn/ml-common-types/audit_message';
import { ALERT_DATAFEED_RESULTS, ALERT_DELAYED_DATA_RESULTS, ALERT_JOB_ERRORS_RESULTS, ALERT_MML_RESULTS } from '../../../common/constants/alerts';
import type { AnomalyDetectionJobsHealthRuleParams } from '../../routes/schemas/alerting_schema';
import type { RegisterAlertParams } from './register_ml_alerts';
type ModelSizeStats = MlJobStats['model_size_stats'];
export interface MmlTestResponse {
    job_id: string;
    memory_status: ModelSizeStats['memory_status'];
    log_time: string;
    model_bytes: string;
    model_bytes_memory_limit: string;
    peak_model_bytes: string;
    model_bytes_exceeded: string;
}
export interface MmlTestPayloadResponse {
    job_id: string;
    memory_status: ModelSizeStats['memory_status'];
    log_time: ModelSizeStats['log_time'];
    model_bytes: ByteSize;
    model_bytes_memory_limit: ByteSize;
    peak_model_bytes: ByteSize;
    model_bytes_exceeded: ByteSize;
}
export interface NotStartedDatafeedResponse {
    datafeed_id: string;
    datafeed_state: MlDatafeedState;
    job_id: string;
    job_state: MlJobState;
}
export interface DelayedDataResponse {
    job_id: string;
    /** Annotation string */
    annotation: string;
    /** Number of missed documents */
    missed_docs_count: number;
    /** Timestamp of the latest finalized bucket with missing docs */
    end_timestamp: string;
}
export interface DelayedDataPayloadResponse {
    job_id: string;
    /** Annotation string */
    annotation: string;
    /** Number of missed documents */
    missed_docs_count: number;
    end_timestamp: DateTime;
}
export interface JobsErrorsResponse {
    job_id: string;
    errors: Array<Omit<JobMessage, 'timestamp'> & {
        timestamp: string;
    }>;
}
export type AnomalyDetectionJobHealthResult = MmlTestResponse | NotStartedDatafeedResponse | DelayedDataResponse | JobsErrorsResponse;
export type AnomalyDetectionJobsHealthAlertContext = {
    results: AnomalyDetectionJobHealthResult[];
    message: string;
} & AlertInstanceContext;
export type AnomalyDetectionJobHealthAlertPayload = {
    [ALERT_REASON]: string;
} & ({
    [ALERT_MML_RESULTS]: MmlTestPayloadResponse[];
} | {
    [ALERT_DATAFEED_RESULTS]: NotStartedDatafeedResponse[];
} | {
    [ALERT_DELAYED_DATA_RESULTS]: DelayedDataPayloadResponse[];
} | {
    [ALERT_JOB_ERRORS_RESULTS]: JobsErrorsResponse[];
});
export declare const ANOMALY_DETECTION_JOB_REALTIME_ISSUE = "anomaly_detection_realtime_issue";
export type AnomalyDetectionJobRealtimeIssue = typeof ANOMALY_DETECTION_JOB_REALTIME_ISSUE;
export declare const REALTIME_ISSUE_DETECTED: ActionGroup<AnomalyDetectionJobRealtimeIssue>;
export type JobsHealthExecutorOptions = RuleExecutorOptions<AnomalyDetectionJobsHealthRuleParams, Record<string, unknown>, Record<string, unknown>, AnomalyDetectionJobsHealthAlertContext, AnomalyDetectionJobRealtimeIssue, MlAnomalyDetectionHealthAlert>;
export declare const ANOMALY_DETECTION_HEALTH_AAD_INDEX_NAME = "ml.anomaly-detection-health";
export declare const ANOMALY_DETECTION_HEALTH_AAD_CONFIG: IRuleTypeAlerts<MlAnomalyDetectionHealthAlert>;
export declare function registerJobsMonitoringRuleType({ alerting, mlServicesProviders, logger, }: RegisterAlertParams): void;
export {};
