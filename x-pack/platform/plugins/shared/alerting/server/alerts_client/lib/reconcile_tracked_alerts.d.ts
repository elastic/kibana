import type { Logger } from '@kbn/core/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { TrackedAADAlerts } from '../types';
import type { TrackedAlertsSearch } from './get_tracked_alerts';
interface LogContext {
    logger: Logger;
    ruleInfoMessage: string;
    logTags: {
        tags: string[];
    };
}
export interface ReconcileTrackedAlertsWithStateParams<AlertData extends RuleAlertData> extends LogContext {
    ruleId: string;
    activeAlertsFromState: Record<string, RawAlertInstance>;
    recoveredAlertsFromState: Record<string, RawAlertInstance>;
    maxAlerts: number;
    search: TrackedAlertsSearch<AlertData>;
}
export interface ReconcileTrackedAlertsWithStateResult<AlertData extends RuleAlertData> extends RestoreStateFromTrackedAlertsResult {
    trackedAlerts: TrackedAADAlerts<AlertData>;
}
/**
 * Loads the rule's tracked alert documents and makes them and the task state agree before
 * the rule runs, so neither side is missing an alert the other one knows about.
 */
export declare function reconcileTrackedAlertsWithState<AlertData extends RuleAlertData>({ ruleId, activeAlertsFromState, recoveredAlertsFromState, maxAlerts, search, logger, ruleInfoMessage, logTags, }: ReconcileTrackedAlertsWithStateParams<AlertData>): Promise<ReconcileTrackedAlertsWithStateResult<AlertData>>;
export interface RestoreStateFromTrackedAlertsParams<AlertData extends RuleAlertData> extends LogContext {
    trackedAlerts: TrackedAADAlerts<AlertData>;
    activeAlertsFromState: Record<string, RawAlertInstance>;
    recoveredAlertsFromState: Record<string, RawAlertInstance>;
    maxAlerts: number;
}
export interface RestoreStateFromTrackedAlertsResult {
    activeAlertsFromState: Record<string, RawAlertInstance>;
    recoveredAlertsFromState: Record<string, RawAlertInstance>;
    restoredInstanceIds: string[];
    skippedInstanceIds: string[];
}
/**
 * Rebuilds task state entries for active and delayed documents the state does not know.
 * This happens when a run persisted its alerts and died before its state was saved. Without
 * this, the next run would treat the alert as new and create a second document.
 */
export declare function restoreStateFromTrackedAlerts<AlertData extends RuleAlertData>({ trackedAlerts, activeAlertsFromState, recoveredAlertsFromState, maxAlerts, logger, ruleInfoMessage, logTags, }: RestoreStateFromTrackedAlertsParams<AlertData>): RestoreStateFromTrackedAlertsResult;
/**
 * Maps an alert document back to the task state shape the legacy alerts client reads.
 */
export declare function alertDocToRawAlertInstance(alertDoc: Alert): RawAlertInstance;
export {};
