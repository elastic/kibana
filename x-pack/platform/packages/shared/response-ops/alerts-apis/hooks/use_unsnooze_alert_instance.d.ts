import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ServerError, ToggleAlertParams } from '../types';
export interface UseUnsnoozeAlertInstanceParams {
    http: HttpStart;
    notifications: NotificationsStart;
    skipAlertsQueryContext?: boolean;
}
export declare const getKey: () => readonly [string, "unsnoozeAlertInstance"];
export declare const useUnsnoozeAlertInstance: ({ http, notifications: { toasts }, skipAlertsQueryContext, }: UseUnsnoozeAlertInstanceParams) => import("@tanstack/react-query").UseMutationResult<void, ServerError, ToggleAlertParams, unknown>;
