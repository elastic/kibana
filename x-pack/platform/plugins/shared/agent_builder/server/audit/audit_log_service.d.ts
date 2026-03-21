import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type { BulkCreateMcpToolsResponse } from '../../common/http_api/tools';
import { AgentBuilderAuditAction, type AgentAuditEventParams, type SkillAuditEventParams, type ToolAuditEventParams } from './audit_events';
interface AuditLogServiceDeps {
    security: SecurityServiceStart;
    logger: Logger;
}
export interface BulkToolAuditEvent {
    toolId: string;
    toolType?: string;
    /**
     * When true, indicates the operation was intentionally skipped (e.g. bulk create with
     * `skip_existing: true`). Skipped events should not be logged.
     */
    skipped?: boolean;
    /**
     * When set, the audit event will be logged as a failure.
     */
    error?: Error;
}
export declare class AuditLogService {
    private readonly deps;
    constructor(deps: AuditLogServiceDeps);
    private log;
    logAgentCreated(request: KibanaRequest, params: Omit<AgentAuditEventParams, 'action'>): void;
    logAgentUpdated(request: KibanaRequest, params: Omit<AgentAuditEventParams, 'action'>): void;
    logAgentDeleted(request: KibanaRequest, params: Omit<AgentAuditEventParams, 'action'>): void;
    logSkillCreated(request: KibanaRequest, params: Omit<SkillAuditEventParams, 'action'>): void;
    logSkillUpdated(request: KibanaRequest, params: Omit<SkillAuditEventParams, 'action'>): void;
    logSkillDeleted(request: KibanaRequest, params: Omit<SkillAuditEventParams, 'action'>): void;
    logToolCreated(request: KibanaRequest, params: Omit<ToolAuditEventParams, 'action'>): void;
    logToolUpdated(request: KibanaRequest, params: Omit<ToolAuditEventParams, 'action'>): void;
    logToolDeleted(request: KibanaRequest, params: Omit<ToolAuditEventParams, 'action'>): void;
    /**
     * Bulk helper to log tool create/delete events.
     *
     * The audit event outcome is derived from presence of `error`.
     */
    logBulkToolEvents(request: KibanaRequest, action: AgentBuilderAuditAction.TOOL_CREATE | AgentBuilderAuditAction.TOOL_DELETE, events: BulkToolAuditEvent[]): void;
    /**
     * Bulk helper used by internal bulk delete endpoints.
     */
    logBulkToolDeleteResults(request: KibanaRequest, params: {
        ids: string[];
        deleteResults: Array<PromiseSettledResult<boolean>>;
    }): void;
    /**
     * Bulk helper used by internal MCP import endpoints.
     */
    logBulkCreateMcpToolResults(request: KibanaRequest, params: {
        results: BulkCreateMcpToolsResponse['results'];
    }): void;
}
export {};
