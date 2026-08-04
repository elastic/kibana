import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
export type ServerError = IHttpFetchError<ResponseErrorBody>;
export interface ToggleAlertParams {
    ruleId: string;
    alertInstanceId: string;
}
/**
 * Map from rule ids to muted alert instance ids
 */
export type MutedAlerts = Record<string, string[]>;
export type SnoozeConditionType = 'field_change' | 'severity_change' | 'severity_equals';
export type SnoozeCondition = {
    type: 'field_change';
    field: string;
} | {
    type: 'severity_change';
} | {
    type: 'severity_equals';
    value: 'critical' | 'high' | 'medium' | 'low' | 'info';
};
export interface SnoozedInstance {
    instanceId: string;
    expiresAt?: string;
    conditions?: SnoozeCondition[];
    conditionOperator?: 'any' | 'all';
    snoozedAt: string;
    snoozedBy: string;
}
/**
 * Map from rule ids to snoozed alert instances
 */
export type SnoozedAlerts = Record<string, SnoozedInstance[]>;
