import { AgentMiddleware, type InterruptOnConfig, StructuredTool } from "langchain";
import type { LanguageModelLike } from "@langchain/core/language_models/base";
export type { AgentMiddleware };
/**
 * Type definitions for subagents
 */
export interface SubAgent {
    /** The name of the agent */
    name: string;
    /** The description of the agent */
    description: string;
    /** The system prompt to use for the agent */
    systemPrompt: string;
    /** The tools to use for the agent (tool instances, not names). Defaults to defaultTools */
    tools?: StructuredTool[];
    /** The model for the agent. Defaults to default_model */
    model?: LanguageModelLike | string;
    /** Additional middleware to append after default_middleware */
    middleware?: AgentMiddleware[];
    /** The tool configs to use for the agent */
    interruptOn?: Record<string, boolean | InterruptOnConfig>;
}
/**
 * Options for creating subagent middleware
 */
export interface SubAgentMiddlewareOptions {
    /** The model to use for subagents */
    defaultModel: LanguageModelLike | string;
    /** The tools to use for the default general-purpose subagent */
    defaultTools?: StructuredTool[];
    /** Default middleware to apply to all subagents */
    defaultMiddleware?: AgentMiddleware[] | null;
    /** The tool configs for the default general-purpose subagent */
    defaultInterruptOn?: Record<string, boolean | InterruptOnConfig> | null;
    /** A list of additional subagents to provide to the agent */
    subagents?: Array<SubAgent>;
    /** Full system prompt override */
    systemPrompt?: string | null;
    /** Whether to include the general-purpose agent */
    generalPurposeAgent?: boolean;
    /** Custom description for the task tool */
    taskDescription?: string | null;
}
/**
 * Create subagent middleware with task tool
 */
export declare function createSubAgentMiddleware(options: SubAgentMiddlewareOptions): AgentMiddleware;
