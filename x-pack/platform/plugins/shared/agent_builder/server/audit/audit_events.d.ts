import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
export declare enum AUDIT_TYPE {
    CREATION = "creation",
    CHANGE = "change",
    DELETION = "deletion"
}
export declare enum AUDIT_CATEGORY {
    DATABASE = "database"
}
export declare enum AUDIT_OUTCOME {
    FAILURE = "failure",
    SUCCESS = "success",
    UNKNOWN = "unknown"
}
export declare enum AgentBuilderAuditAction {
    AGENT_CREATE = "agent_builder_agent_create",
    AGENT_UPDATE = "agent_builder_agent_update",
    AGENT_DELETE = "agent_builder_agent_delete",
    TOOL_CREATE = "agent_builder_tool_create",
    TOOL_UPDATE = "agent_builder_tool_update",
    TOOL_DELETE = "agent_builder_tool_delete",
    SKILL_CREATE = "agent_builder_skill_create",
    SKILL_UPDATE = "agent_builder_skill_update",
    SKILL_DELETE = "agent_builder_skill_delete"
}
interface CommonAuditEventParams {
    action: AgentBuilderAuditAction;
    outcome?: EcsEvent['outcome'];
    error?: Error;
}
export interface AgentAuditEventParams extends CommonAuditEventParams {
    agentId?: string;
    agentName?: string;
}
export declare function agentAuditEvent({ action, agentId, agentName, outcome, error, }: AgentAuditEventParams): AuditEvent;
export interface SkillAuditEventParams extends CommonAuditEventParams {
    skillId?: string;
}
export declare function skillAuditEvent({ action, skillId, outcome, error, }: SkillAuditEventParams): AuditEvent;
export interface ToolAuditEventParams extends CommonAuditEventParams {
    toolId?: string;
    toolType?: string;
}
export declare function toolAuditEvent({ action, toolId, toolType, outcome, error, }: ToolAuditEventParams): AuditEvent;
export {};
