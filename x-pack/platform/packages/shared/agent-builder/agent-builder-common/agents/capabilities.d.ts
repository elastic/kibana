/**
 * Set of capabilities to use when calling an agent.
 */
export interface AgentCapabilities {
    /**
     * If true, will allow the agent to return visualizations in the response.
     */
    visualizations?: boolean;
}
export type ResolvedAgentCapabilities = Required<AgentCapabilities>;
export declare const getKibanaDefaultAgentCapabilities: () => ResolvedAgentCapabilities;
