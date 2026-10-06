/**
 * How a sub-agent invocation via `run_subagent` behaves w.r.t. persistence:
 * - `transient`: fire-and-forget standalone execution, no conversation, cannot be resumed.
 * - `persistent`: backed by a child conversation, addressable by name via `send_message`.
 */
export declare enum SubagentMode {
    transient = "transient",
    persistent = "persistent"
}
