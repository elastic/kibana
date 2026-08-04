import type { RawRuleSnoozedInstance } from '../../saved_objects/schemas/raw_rule';
export interface EvaluatePerAlertSnoozeExpiryResult {
    activeInstances: RawRuleSnoozedInstance[];
    expiredInstances: RawRuleSnoozedInstance[];
}
export declare const evaluatePerAlertSnoozeExpiry: (snoozedInstances: RawRuleSnoozedInstance[] | undefined, now: Date) => EvaluatePerAlertSnoozeExpiryResult;
