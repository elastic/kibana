import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
export declare const useToolsService: () => {
    tools: import("@kbn/agent-builder-common").ToolDefinition<import("@kbn/agent-builder-common").ToolType, Record<string, unknown>>[];
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
export declare const useToolService: (toolId?: string) => {
    tool: ToolDefinitionWithSchema | undefined;
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
export interface UseToolProps {
    toolId?: string;
    onLoadingError?: (error: Error) => void;
}
export declare const useTool: ({ toolId, onLoadingError }: UseToolProps) => {
    tool: ToolDefinitionWithSchema<import("@kbn/agent-builder-common").ToolType, Record<string, unknown>> | undefined;
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
export interface UseToolsWithErrorHandlingProps {
    onLoadingError?: (error: Error) => void;
}
export declare const useTools: ({ onLoadingError }?: UseToolsWithErrorHandlingProps) => {
    tools: import("@kbn/agent-builder-common").ToolDefinition<import("@kbn/agent-builder-common").ToolType, Record<string, unknown>>[];
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
