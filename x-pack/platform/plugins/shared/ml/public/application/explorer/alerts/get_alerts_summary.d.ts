import type { AnomalyDetectionAlert } from './anomaly_detection_alerts_state_service';
export type RulesSummary = Array<[string, RuleSummary]>;
export interface RuleSummary {
    activeCount: number;
    totalCount: number;
    lastDuration: number;
    startedAt: number;
    recoveredAt: number | undefined;
}
export declare function getAlertsSummary(alertsData: AnomalyDetectionAlert[]): RulesSummary;
