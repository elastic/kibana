import type { IUiSettingsClient } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
export interface Connector {
    id: string;
    name: string;
    actionTypeId: string;
    config?: Record<string, unknown>;
    isPreconfigured?: boolean;
    isDeprecated?: boolean;
    isSystemAction?: boolean;
    isMissingSecrets?: boolean;
    referencedByCount?: number;
}
export interface UseGenAIConnectorsResult {
    connectors: Connector[] | undefined;
    selectedConnector: string | undefined;
    loading: boolean;
    error: Error | undefined;
    selectConnector: (id: string) => void;
    reloadConnectors: () => Promise<void>;
    isConnectorSelectionRestricted: boolean;
    defaultConnector: string | undefined;
}
export declare function useGenAIConnectors({ streamsRepositoryClient, uiSettings, }: {
    streamsRepositoryClient: StreamsRepositoryClient;
    uiSettings: IUiSettingsClient;
}): UseGenAIConnectorsResult;
