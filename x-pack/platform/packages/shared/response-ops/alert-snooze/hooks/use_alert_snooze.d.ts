import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { AlertSnoozePayload } from '../components/use_snooze_form';
export interface UseAlertSnoozeParams {
    http: HttpStart;
    notifications: NotificationsStart;
    ruleId?: string;
    instanceId?: string;
    /** Whether the alert instance is currently muted (indefinite snooze). */
    isMuted?: boolean;
    /** Whether the alert instance currently has a time/condition based snooze. */
    isSnoozed?: boolean;
    /** Called after a successful snooze/unsnooze, e.g. to refetch snooze state. */
    onSuccess?: () => void;
    /**
     * Run the underlying mutations against the default react-query context instead
     * of `AlertsQueryContext`. Needed for consumers without an `AlertsQueryContext`
     * provider (e.g. the alert details page).
     */
    skipAlertsQueryContext?: boolean;
}
export interface UseAlertSnoozeResult {
    /** Applies a snooze payload, choosing the mute vs snooze API automatically. */
    snoozeAlert: (payload: AlertSnoozePayload) => Promise<boolean>;
    /** Clears any mute and/or snooze currently applied to the alert instance. */
    unsnoozeAlert: () => Promise<boolean>;
}
/**
 * Encapsulates the per-alert snooze business rules so consumers don't need to
 * know how snooze maps onto the underlying alerting APIs:
 *  - "Snooze indefinitely" with no conditions reuses the mute API.
 *  - Any time-based or condition-based snooze uses the snooze API.
 *  - Unsnooze reverses whichever of mute/snooze is currently applied.
 *
 * It delegates the actual requests (and their success/error toasts) to the
 * shared `@kbn/response-ops-alerts-apis` mutation hooks. Use `onSuccess` to
 * refresh any cached snooze state.
 *
 * Each action resolves to `true` on success and `false` when it was skipped
 * (missing ids) or failed, so callers can gate UI side effects like closing a
 * popover.
 */
export declare const useAlertSnooze: ({ http, notifications, ruleId, instanceId, isMuted, isSnoozed, onSuccess, skipAlertsQueryContext, }: UseAlertSnoozeParams) => UseAlertSnoozeResult;
