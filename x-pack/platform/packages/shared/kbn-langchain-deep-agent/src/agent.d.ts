import { type AgentMiddleware, type ReactAgent, type InterruptOnConfig, StructuredTool } from "langchain";
import type { BaseCheckpointSaver, BaseStore } from "@langchain/langgraph-checkpoint";
import { type SubAgent } from "./middleware/index";
import { type BackendProtocol } from "./backends/index";
import { InteropZodObject } from "@langchain/core/utils/types";
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { AnnotationRoot } from "@langchain/langgraph";
/**
 * Configuration parameters for creating a Deep Agent
 * Matches Python's create_deep_agent parameters
 */
export interface CreateDeepAgentParams<ContextSchema extends AnnotationRoot<any> | InteropZodObject = AnnotationRoot<any>> {
    /** The model to use (model name string or LanguageModelLike instance). Defaults to claude-sonnet-4-5-20250929 */
    model?: BaseLanguageModel | string;
    /** Tools the agent should have access to */
    tools?: StructuredTool[];
    /** Custom system prompt for the agent. This will be combined with the base agent prompt */
    systemPrompt?: string;
    /** Custom middleware to apply after standard middleware */
    middleware?: AgentMiddleware[];
    /** List of subagent specifications for task delegation */
    subagents?: SubAgent[];
    /** Structured output response format for the agent */
    responseFormat?: any;
    /** Optional schema for context (not persisted between invocations) */
    contextSchema?: ContextSchema;
    /** Optional checkpointer for persisting agent state between runs */
    checkpointer?: BaseCheckpointSaver | boolean;
    /** Optional store for persisting longterm memories */
    store?: BaseStore;
    /**
     * Optional backend for filesystem operations.
     * Can be either a backend instance or a factory function that creates one.
     * The factory receives a config object with state and store.
     */
    backend?: BackendProtocol | ((config: {
        state: unknown;
        store?: BaseStore;
    }) => BackendProtocol);
    /** Optional interrupt configuration mapping tool names to interrupt configs */
    interruptOn?: Record<string, boolean | InterruptOnConfig>;
    /** The name of the agent */
    name?: string;
}
/**
 * Create a Deep Agent with middleware-based architecture.
 *
 * Matches Python's create_deep_agent function, using middleware for all features:
 * - Todo management (todoListMiddleware)
 * - Filesystem tools (createFilesystemMiddleware)
 * - Subagent delegation (createSubAgentMiddleware)
 * - Conversation summarization (summarizationMiddleware)
 * - Prompt caching (anthropicPromptCachingMiddleware)
 * - Tool call patching (createPatchToolCallsMiddleware)
 * - Human-in-the-loop (humanInTheLoopMiddleware) - optional
 *
 * @param params Configuration parameters for the agent
 * @returns ReactAgent instance ready for invocation
 */
export declare function createDeepAgent<ContextSchema extends AnnotationRoot<any> | InteropZodObject = AnnotationRoot<any>>(params?: CreateDeepAgentParams<ContextSchema>): ReactAgent<any, any, ContextSchema, any>;
