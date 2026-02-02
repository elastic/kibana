import { StructuredTool } from "@langchain/core/tools";
import { BrowserApiToolMetadata } from "@kbn/agent-builder-common";
import { AgentEventEmitterFn, ExecutableTool } from "@kbn/agent-builder-server";
import { Logger } from "@kbn/logging";

type ToolManagerParams = {
    dynamicToolCapacity: number;
}

type ToolName = string;

type AddToolOptions = {
    dynamic?: boolean;
}

export enum ToolManagerToolType {
    executable = 'executable',
    browser = 'browser',
}

type ExecutableToolInput = {
    type: ToolManagerToolType.executable;
    tools: ExecutableTool | ExecutableTool[];
    logger: Logger;
    eventEmitter?: AgentEventEmitterFn;
}

type BrowserToolInput = {
    type: ToolManagerToolType.browser;
    tools: BrowserApiToolMetadata | BrowserApiToolMetadata[];
}

type AddToolInput = ExecutableToolInput | BrowserToolInput;

/**
 * Interface for managing tools in the agent system.
 * Handles both static and dynamic tools with LRU eviction for dynamic tools.
 */
interface ToolManager {
    /**
     * Adds tools to the tool manager.
     * Supports both executable tools and browser API tools.
     * @param input - The tool input configuration (executable or browser)
     * @param options - Optional configuration for tool storage (static vs dynamic)
     */
    addTool(input: AddToolInput, options?: AddToolOptions): Promise<void>;

    /**
     * Lists all tools in the tool manager.
     * @returns an array of all tools (static and dynamic)
     */
    list(): StructuredTool[];

    /**
     * Records the use of a tool, marking it as recently used.
     * This affects LRU eviction for dynamic tools.
     * @param name - the name of the tool to record usage for
     */
    recordToolUse(name: ToolName): void;

    /**
     * Gets the tool id mapping.
     * Maps LangChain tool names to internal tool IDs.
     * @returns the tool id mapping
     */
    getToolIdMapping(): Map<string, string>;

    /**
     * Gets the internal tool IDs of all dynamic tools currently in the tool manager.
     * Returns internal tool IDs (not LangChain names) for persistence.
     * @returns array of internal tool IDs
     */
    getDynamicToolIds(): string[];
}

export type {
    ToolManager,
    ToolManagerParams,
    ToolName,
    AddToolOptions,
    ExecutableToolInput,
    BrowserToolInput,
    AddToolInput,
};