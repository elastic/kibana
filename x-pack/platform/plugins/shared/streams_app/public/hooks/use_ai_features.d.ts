import { type UseGenAIConnectorsResult } from './use_genai_connectors';
export interface AIFeatures {
    loading: boolean;
    enabled: boolean;
    couldBeEnabled: boolean;
    genAiConnectors: UseGenAIConnectorsResult;
    isManagedAIConnector: boolean;
    hasAcknowledgedAdditionalCharges: boolean;
    acknowledgeAdditionalCharges: (isDismissed: boolean) => void;
}
export declare function useAIFeatures(): AIFeatures | null;
