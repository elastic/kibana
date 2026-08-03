import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ServerError, SnoozeCondition } from '../types';
export interface UseSnoozeAlertInstanceParams {
    http: HttpStart;
    notifications: NotificationsStart;
    skipAlertsQueryContext?: boolean;
}
export interface SnoozeAlertInstanceMutationParams {
    ruleId: string;
    alertInstanceId: string;
    expiresAt?: string;
    conditions?: SnoozeCondition[];
    conditionOperator?: 'any' | 'all';
}
export declare const getKey: () => readonly [string, "snoozeAlertInstance"];
export declare const useSnoozeAlertInstance: ({ http, notifications: { toasts }, skipAlertsQueryContext, }: UseSnoozeAlertInstanceParams) => import("@tanstack/react-query").UseMutationResult<void, ServerError, SnoozeAlertInstanceMutationParams, unknown>;
