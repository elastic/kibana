import { ModelFamily, ModelPlatform, ModelProvider } from '../model_provider';
import { type InferenceConnector } from './connectors';
export declare const DEFAULT_OPENAI_MODEL = "gpt-4.1";
/**
 * Returns the default model as defined in the connector's config, if available.
 *
 * Note: preconfigured connectors only expose their config if their `exposeConfig` flag
 * is set to true.
 */
export declare const getConnectorDefaultModel: (connector: InferenceConnector) => string | undefined;
/**
 * Returns the provider used for the given connector
 *
 * Inferred from the type for "legacy" connectors,
 * and from the provider config field for inference connectors.
 */
export declare const getConnectorProvider: (connector: InferenceConnector) => ModelProvider;
/**
 * Returns the platform for the given connector
 */
export declare const getConnectorPlatform: (connector: InferenceConnector) => ModelPlatform;
export declare const getConnectorFamily: (connector: InferenceConnector, _modelName?: string) => ModelFamily;
