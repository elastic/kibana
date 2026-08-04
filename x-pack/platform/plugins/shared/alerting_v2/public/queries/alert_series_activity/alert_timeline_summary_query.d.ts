import type { AlertTimelineSummary } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
export interface AlertTimelineSummaryEsqlRow {
    episodes_started: number;
    recovered: number;
    still_open: number;
    median_duration_ms: number | null;
}
export interface BuildAlertTimelineSummaryQueryOptions {
    ruleId: string;
    windowStartMs: number;
    windowEndMs: number;
}
export declare const buildAlertTimelineSummaryQuery: ({ ruleId, windowStartMs, windowEndMs, }: BuildAlertTimelineSummaryQueryOptions) => import("@elastic/esql").ComposerQuery;
export declare const parseAlertTimelineSummaryRow: (row: AlertTimelineSummaryEsqlRow | undefined) => AlertTimelineSummary;
