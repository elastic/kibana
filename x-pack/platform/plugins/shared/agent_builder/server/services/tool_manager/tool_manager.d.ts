import type { StructuredTool } from '@langchain/core/tools';
import type { AgentEventEmitterFn } from '@kbn/agent-builder-server';
import type { ToolReturnSummarizerFn } from '@kbn/agent-builder-server/tools/builtin';
import type { ToolManager as IToolManager, ToolManagerParams, ToolName, AddToolOptions, AddToolInput } from '@kbn/agent-builder-server/runner/tool_manager';
export declare const createToolManager: () => ToolManager;
/**
 * ToolManager is a class that manages tools for the agent.
 * It stores static tools and dynamic tools. Static tools do not change through out a round while dynamic tools can be added and removed.
 *
 * Dynamic tools are limited to a certain capacity to prevent too many tools from being added to the agent.
 * Least recently used tools are evicted when the capacity is reached.
 */
export declare class ToolManager implements IToolManager {
    private staticTools;
    private dynamicTools;
    private toolIdMappings;
    private executableTools;
    private eventEmitter?;
    constructor(params: ToolManagerParams);
    setEventEmitter(eventEmitter: AgentEventEmitterFn): void;
    /**
     * Adds tools to the tool manager.
     * Supports both executable tools and browser API tools.
     * @param input - The tool input configuration (executable or browser)
     * @param options - Optional configuration for tool storage (static vs dynamic)
     */
    addTools(input: AddToolInput, options?: AddToolOptions): Promise<void>;
    /**
     * Lists all tools in the tool manager.
     * @returns an array of all tools (static and dynamic)
     */
    list(): StructuredTool[];
    /**
     * Records the use of a tool, marking it as recently used.
     * This affects LRU eviction for dynamic tools.
     * @param langchainToolName - The name of the LangChain tool to record usage for.
     */
    recordToolUse(langchainToolName: ToolName): void;
    /**
     * Gets the tool id mapping.
     * Maps LangChain tool names to internal tool IDs.
     * @returns the tool id mapping
     */
    getToolIdMapping(): Map<string, string>;
    /**
     * Gets the summarizer function for a tool by its internal tool ID.
     * Returns undefined if the tool is not found or has no summarizer.
     */
    getSummarizer(toolId: string): ToolReturnSummarizerFn | undefined;
    /**
     * Gets the internal tool IDs of all dynamic tools currently in the tool manager.
     * Returns internal tool IDs (not LangChain names) for persistence.
     * @returns array of internal tool IDs
     */
    getDynamicToolIds(): string[];
}
export type { ToolManagerParams };
