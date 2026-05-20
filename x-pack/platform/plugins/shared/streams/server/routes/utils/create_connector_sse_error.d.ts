import type { InferenceTaskProviderError } from '@kbn/inference-common';
import { type InferenceConnector } from '@kbn/inference-common';
export declare function formatInferenceProviderError(error: InferenceTaskProviderError, connector: InferenceConnector): string;
/**
 * Creates a user-friendly SSE error with connector information.
 * Use this in catchError handlers for streaming endpoints that call LLM connectors.
 */
export declare function createConnectorSSEError(error: Error, connector: InferenceConnector): Error;
