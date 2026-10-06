import type { InferenceConnector } from './connectors';
/**
 * Guesses the model based on the connector type and configuration.
 *
 * Inferred from the type for "legacy" connectors,
 * and from the provider config field for inference connectors.
 */
export declare const getConnectorModel: (connector: InferenceConnector) => string | undefined;
