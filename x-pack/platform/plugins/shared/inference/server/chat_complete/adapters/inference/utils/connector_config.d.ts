import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceEndpointProvider } from '@kbn/inference-common';
/**
 * Returns the modelId used by the underlying endpoint of the given inference connector
 */
export declare const getModelId: (connector: InferenceConnector) => string | undefined;
/**
 * Returns the provider used by the underlying endpoint of the given inference connector
 */
export declare const getProvider: (connector: InferenceConnector) => string | undefined;
/**
 * Returns the provider used by the underlying endpoint of the given inference connector
 */
export declare const getElasticModelProvider: (connector: InferenceConnector) => InferenceEndpointProvider | undefined;
