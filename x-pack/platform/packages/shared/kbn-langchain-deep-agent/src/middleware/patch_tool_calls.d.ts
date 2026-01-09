import { AgentMiddleware } from "langchain";
/**
 * Create middleware that patches dangling tool calls in the messages history.
 *
 * When an AI message contains tool_calls but subsequent messages don't include
 * the corresponding ToolMessage responses, this middleware adds synthetic
 * ToolMessages saying the tool call was cancelled.
 *
 * @returns AgentMiddleware that patches dangling tool calls
 *
 * @example
 * ```typescript
 * import { createAgent } from "langchain";
 * import { createPatchToolCallsMiddleware } from "./middleware/patch_tool_calls";
 *
 * const agent = createAgent({
 *   model: "claude-sonnet-4-5-20250929",
 *   middleware: [createPatchToolCallsMiddleware()],
 * });
 * ```
 */
export declare function createPatchToolCallsMiddleware(): AgentMiddleware;
