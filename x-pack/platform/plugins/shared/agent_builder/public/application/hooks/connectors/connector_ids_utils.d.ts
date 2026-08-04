interface AgentWithConnectorIds {
    configuration?: {
        connector_ids?: string[] | null;
    } | null;
}
/**
 * Returns true if the given connector is accessible to the agent.
 *
 * connector_ids === undefined/null is the legacy "all connectors" default: agents created before
 * explicit connector assignment had unrestricted access. An explicit empty array means no connectors.
 */
export declare const agentHasConnector: (agent: AgentWithConnectorIds, connectorId: string) => boolean;
/**
 * Returns the effective connector IDs for an agent, expanding undefined/null to the full list.
 */
export declare const getEffectiveConnectorIds: (agent: AgentWithConnectorIds, allConnectorIds: string[]) => string[];
export {};
