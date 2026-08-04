/**
 * Lifecycle events that can trigger hooks.
 *
 * Note: this is intentionally scoped to server-side agent execution lifecycle.
 */
export declare enum HookLifecycle {
    beforeAgent = "beforeAgent",
    beforeToolCall = "beforeToolCall",
    afterToolCall = "afterToolCall"
}
/**
 * Determines when the hook is executed relative to the main agent execution flow.
 *
 * - blocking: executed before proceeding; errors abort the main agent execution.
 * - nonBlocking: executed in the background; errors are logged and do not abort.
 */
export declare enum HookExecutionMode {
    blocking = "blocking",
    nonBlocking = "nonBlocking"
}
