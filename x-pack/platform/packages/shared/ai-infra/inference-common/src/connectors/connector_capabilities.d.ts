import type { InferenceConnector } from './connectors';
/**
 * Retrieve the context window size for the default model of the given connector, if available.
 */
export declare const getContextWindowSize: (connector: InferenceConnector) => number | undefined;
export declare const contextWindowFromModelName: (modelName: string) => number | undefined;
