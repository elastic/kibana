import type { ToolSelection } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { ToolRegistry } from '@kbn/agent-builder-server';
export interface ValidateToolSelectionParams {
    toolRegistry: ToolRegistry;
    request: KibanaRequest;
    toolSelection: ToolSelection[];
}
export declare function validateToolSelection({ toolRegistry, toolSelection, }: ValidateToolSelectionParams): Promise<string[]>;
export declare function removeToolIdsFromToolSelection(tools: ToolSelection[], toolIdsToRemove: string[]): ToolSelection[];
