import type { ToolDefinition } from '@kbn/inference-common';
export interface GenAiToolDefinition {
    type: 'function';
    name: string;
    description: string;
    parameters?: ToolDefinition['schema'];
}
/** Converts inference tools to the OpenTelemetry GenAI tool-definition schema. */
export declare const getGenAiToolDefinitions: (tools: Record<string, ToolDefinition>) => GenAiToolDefinition[];
