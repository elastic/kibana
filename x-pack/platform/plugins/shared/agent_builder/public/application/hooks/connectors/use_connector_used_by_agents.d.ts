export declare const useConnectorUsedByAgents: ({ connectorId, currentAgentId, }: {
    connectorId: string;
    currentAgentId: string;
}) => {
    usedByAgents: import("../../../../common/http_api/agents").AgentDefinitionWithPermissions[];
    isLoading: boolean;
    error: unknown;
};
