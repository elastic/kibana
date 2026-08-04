import type { ConnectorItem } from '../../../../common/http_api/tools';
export declare const useAgentConnectors: ({ agentId }: {
    agentId: string;
}) => {
    assignedConnectors: ConnectorItem[];
    allConnectors: readonly ConnectorItem[];
    activeConnectorIdSet: Set<string>;
    isLoading: boolean;
    isAssigning: boolean;
    assign: (connector: Pick<ConnectorItem, "id" | "name">) => void;
    unassign: (connector: ConnectorItem) => void;
};
