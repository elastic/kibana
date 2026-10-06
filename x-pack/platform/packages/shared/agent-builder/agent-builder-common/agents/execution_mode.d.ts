export declare enum AgentExecutionMode {
    /**
     * Executes an agent in "conversation" mode, either creating a new one or resuming an existing one,
     * and then persisting the new conversation state based on the output of the execution.
     * This is the "traditional" execution mode.
     */
    conversation = "conversation",
    /**
     * Executes an agent for a standalone execution, not attached to a conversation.
     * Used for sub-agent execution / forking.
     */
    standalone = "standalone"
}
export declare enum SubagentExecutionMode {
    /**
     * Sub-agent executed in the foreground, blocking the main agent execution.
     */
    foreground = "foreground",
    /**
     * Sub-agent executed in the background, without blocking the main agent execution.
     */
    background = "background"
}
