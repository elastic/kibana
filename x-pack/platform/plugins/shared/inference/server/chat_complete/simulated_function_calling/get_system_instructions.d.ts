import type { ToolDefinition } from '@kbn/inference-common';
export declare function getSystemMessageInstructions({ tools, }: {
    tools?: Record<string, ToolDefinition>;
}): string;
