import type { SnoozeAlertInstanceBody } from '../../application/rule/methods/snooze_alert_instance/types';
import type { RawRuleSnoozedInstance } from '../../saved_objects/schemas/raw_rule';
export declare const getPerAlertSnoozeSnapshotFields: (body: SnoozeAlertInstanceBody) => string[];
export declare const buildPerAlertSnoozeEntry: ({ alertInstanceId, body, snoozedAt, snoozedBy, snoozeSnapshot, }: {
    alertInstanceId: string;
    body: SnoozeAlertInstanceBody;
    snoozedAt: string;
    snoozedBy: string | null;
    snoozeSnapshot?: Record<string, unknown>;
}) => RawRuleSnoozedInstance;
export declare const upsertPerAlertSnoozeEntry: ({ snoozedInstances, snoozedInstance, }: {
    snoozedInstances?: RawRuleSnoozedInstance[];
    snoozedInstance: RawRuleSnoozedInstance;
}) => RawRuleSnoozedInstance[];
export declare const removePerAlertSnoozeEntry: ({ snoozedInstances, alertInstanceId, }: {
    snoozedInstances?: RawRuleSnoozedInstance[];
    alertInstanceId: string;
}) => RawRuleSnoozedInstance[];
