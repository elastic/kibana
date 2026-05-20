import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentEventEmitterFn, ExecutableTool, ToolProvider } from '@kbn/agent-builder-server';
import type { ToolCall } from './messages';
export type ToolIdMapping = Map<string, string>;
export interface ToolsAndMappings {
    /**
     * The tools in langchain format
     */
    tools: StructuredTool[];
    /**
     * ID mapping that can be used to retrieve the agentBuilder tool id from the langchain tool id.
     */
    idMappings: ToolIdMapping;
    /**
     * ID mapping to get the langchain tool fron agentBuilder id map
     */
    agentBuilderToLangchainIdMap: ToolIdMapping;
}
export declare const toolsToLangchain: ({ request, tools, logger, sendEvent, addReasoningParam, }: {
    request: KibanaRequest;
    tools: ToolProvider | ExecutableTool[];
    logger: Logger;
    sendEvent?: AgentEventEmitterFn;
    addReasoningParam?: boolean;
}) => Promise<ToolsAndMappings>;
export declare const sanitizeToolId: (toolId: string) => string;
/**
 * Create a [agentBuilder tool id] -> [langchain tool id] mapping.
 *
 * Handles id sanitization (e.g. removing dot prefixes), and potential id conflict.
 */
export declare const createToolIdMappings: <T extends {
    id: string;
}>(tools: T[]) => ToolIdMapping;
export declare const toolToLangchain: ({ tool, toolId, logger, sendEvent, addReasoningParam, }: {
    tool: ExecutableTool;
    toolId?: string;
    logger: Logger;
    sendEvent?: AgentEventEmitterFn;
    addReasoningParam?: boolean;
}) => Promise<StructuredTool>;
export declare const toolIdentifierFromToolCall: (toolCall: ToolCall, mapping: ToolIdMapping) => string;
export declare function reverseMap<K, V>(map: Map<K, V>): Map<V, K>;
