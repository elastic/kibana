import type { AgentDefinition, ToolDefinition } from '@kbn/agent-builder-common';
export declare const useToolsMutation: ({ agent, allTools, }: {
    agent: AgentDefinition | null;
    allTools: ToolDefinition[];
}) => {
    handleAddTool: (tool: ToolDefinition, { onSuccess }?: {
        onSuccess?: (toolId: string) => void;
    }) => void;
    handleRemoveTool: (tool: ToolDefinition) => void;
};
