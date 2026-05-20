import { type InferenceConnector as CommonInferenceConnector, type RawConnector, type InferenceConnectorType, type ModelFamily, type ModelProvider } from '@kbn/inference-common';
export interface InferenceConnector {
    connectorId: string;
    name: string;
    type: InferenceConnectorType;
    modelFamily: ModelFamily;
    modelProvider: ModelProvider;
    modelId: string | undefined;
}
export declare const getInferenceConnectorInfo: (connector?: CommonInferenceConnector | RawConnector) => InferenceConnector | undefined;
