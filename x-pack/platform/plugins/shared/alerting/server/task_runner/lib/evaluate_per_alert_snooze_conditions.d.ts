import type { RawRuleSnoozedInstance } from '../../saved_objects/schemas/raw_rule';
export interface EvaluatePerAlertSnoozeConditionsResult {
    conditionExpiredInstances: RawRuleSnoozedInstance[];
}
/**
 * Evaluates field-change-based unsnooze conditions for each time-active snoozed
 * instance. An instance is condition-expired when its conditions indicate the
 * snooze should be lifted (e.g. a tracked field changed from the snapshot value).
 *
 * @param activeSnoozedInstances - Instances that are still time-active (not yet
 *   expired by `expiresAt`). Only these are candidates for condition evaluation.
 * @param alertAsDataByInstanceId - Map of alert instanceId → raw alert-as-data
 *   document for currently active alerts. Instances not present in this map are
 *   skipped (alert is not currently firing or has no AAD).
 */
export declare const evaluatePerAlertSnoozeConditions: (activeSnoozedInstances: RawRuleSnoozedInstance[], alertAsDataByInstanceId: Map<string, Record<string, unknown>>) => EvaluatePerAlertSnoozeConditionsResult;
