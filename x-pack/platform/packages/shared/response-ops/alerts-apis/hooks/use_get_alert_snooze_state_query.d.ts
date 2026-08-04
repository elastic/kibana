import type { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { MutedAlerts, SnoozedAlerts, ServerError } from '../types';
import type { GetAlertSnoozeStateByRuleParams } from '../apis/get_muted_alerts_instances_by_rule';
export interface AlertSnoozeState {
    mutedAlerts: MutedAlerts;
    snoozedAlerts: SnoozedAlerts;
}
declare const getAlertSnoozeState: ({ http, signal, ruleIds, }: GetAlertSnoozeStateByRuleParams) => Promise<AlertSnoozeState>;
export interface UseGetAlertSnoozeStateQueryParams {
    ruleIds: string[];
    http: HttpStart;
    notifications: NotificationsStart;
    /**
     * When true, runs against the default react-query context instead of
     * `AlertsQueryContext`. Use this outside the alerts table (e.g. the alert
     * details page) where no `AlertsQueryContext` provider is mounted.
     */
    skipAlertsQueryContext?: boolean;
}
export declare const getKey: (ruleIds: string[]) => readonly [string, "alertSnoozeStateForRuleIds", string[]];
export declare const useGetAlertSnoozeStateQuery: ({ ruleIds, http, notifications: { toasts }, skipAlertsQueryContext, }: UseGetAlertSnoozeStateQueryParams, { enabled }?: QueryOptionsOverrides<typeof getAlertSnoozeState>) => import("@tanstack/react-query").UseQueryResult<AlertSnoozeState, ServerError>;
export {};
