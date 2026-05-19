import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
export declare enum ScheduledReportAuditAction {
    SCHEDULE = "scheduled_report_schedule",
    LIST = "scheduled_report_list",
    DISABLE = "scheduled_report_disable",
    DELETE = "scheduled_report_delete",
    UPDATE = "scheduled_report_update",
    ENABLE = "scheduled_report_enable"
}
export interface ScheduledReportAuditEventParams {
    action: ScheduledReportAuditAction;
    outcome?: EcsEvent['outcome'];
    savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
    error?: Error;
}
export declare function scheduledReportAuditEvent({ action, savedObject, outcome, error, }: ScheduledReportAuditEventParams): AuditEvent;
