import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';
export type WorkflowToolConfig = {
    workflow_id: string;
    wait_for_completion?: boolean;
};
export declare const WAIT_FOR_COMPLETION_TIMEOUT_SEC = 120;
export type WorkflowToolDefinition = ToolDefinition<ToolType.workflow, WorkflowToolConfig>;
export type WorkflowToolDefinitionWithSchema = ToolDefinitionWithSchema<ToolType.workflow, WorkflowToolConfig>;
export declare function isWorkflowTool(tool: ToolDefinitionWithSchema): tool is WorkflowToolDefinitionWithSchema;
export declare function isWorkflowTool(tool: ToolDefinition): tool is WorkflowToolDefinition;
