import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ServerError, ToggleAlertParams } from '../types';
export interface UseMuteAlertInstanceParams {
    http: HttpStart;
    notifications: NotificationsStart;
    skipAlertsQueryContext?: boolean;
}
export declare const getKey: () => readonly [string, "muteAlertInstance"];
export declare const useMuteAlertInstance: ({ http, notifications: { toasts }, skipAlertsQueryContext, }: UseMuteAlertInstanceParams) => import("@tanstack/react-query").UseMutationResult<void, ServerError, ToggleAlertParams, unknown>;
