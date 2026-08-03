import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
export declare enum AlertAuditAction {
    GET = "alert_get",
    UPDATE = "alert_update",
    FIND = "alert_find",
    DELETE = "alert_delete",
    SCHEDULE_DELETE = "alert_schedule_delete",
    ACKNOWLEDGE = "alert_acknowledge",
    UNACKNOWLEDGE = "alert_unacknowledge",
    SNOOZE = "alert_snooze",
    UNSNOOZE = "alert_unsnooze",
    AUTO_UNSNOOZE = "alert_auto_unsnooze"
}
export declare const operationAlertAuditActionMap: {
    update: AlertAuditAction;
    delete: AlertAuditAction;
    find: AlertAuditAction;
    get: AlertAuditAction;
};
/**
 * Maps workflow status values to specific audit actions.
 * Falls back to the generic UPDATE action for unmapped statuses.
 */
export declare const workflowStatusAuditActionMap: Record<string, AlertAuditAction>;
export interface AlertAuditEventParams {
    action: AlertAuditAction;
    actor?: string;
    outcome?: EcsEvent['outcome'];
    id?: string;
    error?: Error;
    bulk?: boolean;
    /** Optional reason appended to success messages, e.g. 'ttl_expired', 'condition_met'. */
    reason?: string;
    /**
     * Optional rule SO reference. When provided, the event message includes the rule context
     * (`alert [id=...] of rule [id=...] [name=...]`) and the SO is attached to `kibana.saved_object`
     * so the security plugin can space-scope the audit event.
     */
    ruleSavedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
}
export declare function alertAuditEvent({ action, id, outcome, error, actor, bulk, reason, ruleSavedObject, }: AlertAuditEventParams): AuditEvent;
export declare function alertAuditSystemEvent({ action, id, outcome, error, reason, ruleSavedObject, }: AlertAuditEventParams): AuditEvent;
