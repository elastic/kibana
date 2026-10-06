import type { InferenceConnector, RawConnector } from './connectors';
/**
 * Converts an action connector to the internal inference connector format.
 *
 * The function will throw if the provided connector is not compatible
 */
export declare const connectorToInference: (connector: RawConnector) => InferenceConnector;
