import type { ActionGroup, AlertInstanceContext, RuleTypeParams, RuleTypeState } from '@kbn/alerting-plugin/common';
import type { IRuleTypeAlerts, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { ALERT_REASON, ALERT_URL } from '@kbn/rule-data-utils';
import type { MlAnomalyDetectionAlert } from '@kbn/alerts-as-data-utils';
import type { InfluencerAnomalyAlertDoc, FormattedRecordAnomalyAlertDoc } from '@kbn/ml-common-types/alerts';
import type { RegisterAlertParams } from './register_ml_alerts';
/**
 * Base Anomaly detection alerting rule context.
 * Relevant for both active and recovered alerts.
 */
export type AnomalyDetectionAlertBaseContext = AlertInstanceContext & {
    jobIds: string[];
    anomalyExplorerUrl: string;
    message: string;
};
export type AnomalyDetectionAlertPayload = {
    job_id: string;
    anomaly_score?: number[];
    is_interim?: boolean;
    anomaly_timestamp?: number;
    top_records?: any;
    top_influencers?: any;
} & {
    [ALERT_URL]: string;
    [ALERT_REASON]: string;
};
export type AnomalyDetectionAlertContext = AnomalyDetectionAlertBaseContext & {
    timestampIso8601: string;
    timestamp: number;
    score: number;
    isInterim: boolean;
    topRecords: FormattedRecordAnomalyAlertDoc[];
    topInfluencers?: InfluencerAnomalyAlertDoc[];
};
export type ExecutorOptions<P extends RuleTypeParams> = RuleExecutorOptions<P, RuleTypeState, {}, AnomalyDetectionAlertContext, typeof ANOMALY_SCORE_MATCH_GROUP_ID, MlAnomalyDetectionAlert>;
export declare const ANOMALY_SCORE_MATCH_GROUP_ID = "anomaly_score_match";
export type AnomalyScoreMatchGroupId = typeof ANOMALY_SCORE_MATCH_GROUP_ID;
export declare const ANOMALY_DETECTION_AAD_INDEX_NAME = "ml.anomaly-detection";
export declare const ANOMALY_DETECTION_AAD_CONFIG: IRuleTypeAlerts<MlAnomalyDetectionAlert>;
export declare const THRESHOLD_MET_GROUP: ActionGroup<AnomalyScoreMatchGroupId>;
export declare function registerAnomalyDetectionAlertType({ alerting, mlSharedServices, }: RegisterAlertParams): void;
