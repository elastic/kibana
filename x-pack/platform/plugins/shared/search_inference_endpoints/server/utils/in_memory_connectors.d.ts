import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';
export declare function filterPreconfiguredEndpoints(endpoints: InferenceInferenceEndpointInfo[]): InferenceInferenceEndpointInfo[];
export declare function findEndpointsWithoutConnectors(endpoints: InferenceInferenceEndpointInfo[], connectors: InMemoryConnector[]): InferenceInferenceEndpointInfo[];
/**
 * Returns the ids of dynamic inference connectors that no longer have a corresponding
 * eligible inference endpoint.
 */
export declare function findStaleDynamicConnectorIds(eligibleEndpoints: InferenceInferenceEndpointInfo[], connectors: InMemoryConnector[]): string[];
export declare function connectorFromEndpoint(endpoint: InferenceInferenceEndpointInfo): InMemoryConnector;
export declare function getConnectorIdFromEndpoint(endpoint: InferenceInferenceEndpointInfo): string;
export declare function getConnectorNameFromEndpoint(endpoint: InferenceInferenceEndpointInfo): string;
