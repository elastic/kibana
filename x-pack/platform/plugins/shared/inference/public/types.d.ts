import type { ChatCompleteAPI, OutputAPI, InferenceConnector } from '@kbn/inference-common';
export interface ConfigSchema {
}
export interface InferenceSetupDependencies {
}
export interface InferenceStartDependencies {
}
export interface InferencePublicSetup {
}
export interface InferencePublicStart {
    chatComplete: ChatCompleteAPI;
    output: OutputAPI;
    getConnectors: () => Promise<InferenceConnector[]>;
}
