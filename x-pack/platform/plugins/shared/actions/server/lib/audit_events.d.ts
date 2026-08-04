import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
export declare enum ConnectorAuditAction {
    CREATE = "connector_create",
    GET = "connector_get",
    UPDATE = "connector_update",
    DELETE = "connector_delete",
    FIND = "connector_find",
    EXECUTE = "connector_execute",
    GET_GLOBAL_EXECUTION_LOG = "connector_get_global_execution_log",
    GET_GLOBAL_EXECUTION_KPI = "connector_get_global_execution_kpi"
}
export interface ConnectorAuditEventParams {
    action: ConnectorAuditAction;
    outcome?: EcsEvent['outcome'];
    savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
    error?: Error;
}
export declare function connectorAuditEvent({ action, savedObject, outcome, error, }: ConnectorAuditEventParams): AuditEvent;
