import type { EsqlToolFieldTypes, EsqlToolParamValue, ToolType, ToolConfirmationPolicyMode } from '@kbn/agent-builder-common';
export interface EsqlParam {
    name: string;
    type: EsqlToolFieldTypes;
    description: string;
    optional: boolean;
    defaultValue?: EsqlToolParamValue;
}
export declare enum EsqlParamSource {
    Inferred = "inferred",
    Custom = "custom"
}
export type EsqlParamFormData = EsqlParam & {
    warning?: string;
    source: EsqlParamSource;
};
export interface BaseToolFormData {
    toolId: string;
    description: string;
    labels: string[];
}
export interface ToolConfirmationFormData {
    confirmation_ask_user?: ToolConfirmationPolicyMode;
}
export interface EsqlToolFormData extends BaseToolFormData {
    type: ToolType.esql;
    esql: string;
    params: EsqlParamFormData[];
}
export interface BuiltinToolFormData extends BaseToolFormData {
    type: ToolType.builtin;
}
export interface IndexSearchToolFormData extends BaseToolFormData {
    type: ToolType.index_search;
    pattern: string;
    rowLimit?: number;
    customInstructions?: string;
}
export interface WorkflowToolFormData extends BaseToolFormData, ToolConfirmationFormData {
    type: ToolType.workflow;
    workflow_id: string;
    wait_for_completion: boolean;
}
export interface McpToolFormData extends BaseToolFormData, ToolConfirmationFormData {
    type: ToolType.mcp;
    connectorId: string;
    mcpToolName: string;
}
export type ToolFormData = EsqlToolFormData | BuiltinToolFormData | IndexSearchToolFormData | WorkflowToolFormData | McpToolFormData;
