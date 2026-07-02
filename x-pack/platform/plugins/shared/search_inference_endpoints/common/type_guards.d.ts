import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { EisInferenceEndpoint, InferenceEndpointWithMetadata, InferenceEndpointWithDisplayNameMetadata, InferenceEndpointWithDisplayCreatorMetadata } from './types';
/**
 * True when the endpoint is a chat-completion inference entry managed as a Kibana dynamic
 * connector (see `filterPreconfiguredEndpoints` in server utils).
 */
export declare function isInferenceEndpointWithKibanaConnectorHeuristic(endpoint: InferenceInferenceEndpointInfo): boolean;
export declare const isEisEndpoint: (ep: InferenceInferenceEndpointInfo) => ep is EisInferenceEndpoint;
export declare function isInferenceEndpointWithMetadata(endpoint: InferenceInferenceEndpointInfo): endpoint is InferenceEndpointWithMetadata;
export declare function isInferenceEndpointWithDisplayNameMetadata(endpoint: InferenceInferenceEndpointInfo): endpoint is InferenceEndpointWithDisplayNameMetadata;
export declare function isInferenceEndpointWithDisplayCreatorMetadata(endpoint: InferenceInferenceEndpointInfo): endpoint is InferenceEndpointWithDisplayCreatorMetadata;
