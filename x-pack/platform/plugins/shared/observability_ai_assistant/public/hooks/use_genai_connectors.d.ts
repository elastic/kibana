import type { InferenceConnector as CommonInferenceConnector } from '@kbn/inference-common';
import { type InferenceConnector } from '../../common/utils/get_inference_connector';
export interface UseGenAIConnectorsResult {
    connectors?: CommonInferenceConnector[];
    selectedConnector?: string;
    loading: boolean;
    error?: Error;
    selectConnector: (id: string) => void;
    reloadConnectors: () => void;
    getConnector: (id: string) => InferenceConnector | undefined;
    isConnectorSelectionRestricted: boolean;
    defaultConnector?: string;
}
export declare function useGenAIConnectors(): UseGenAIConnectorsResult;
export declare function useGenAIConnectorsWithoutContext(): UseGenAIConnectorsResult;
