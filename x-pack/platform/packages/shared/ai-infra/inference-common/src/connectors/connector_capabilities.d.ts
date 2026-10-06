import type { InferenceConnector } from './connectors';
import type { ChatCompletionReasoningEffort } from '../chat_complete/reasoning';
/**
 * Retrieve the context window size for the default model of the given connector, if available.
 */
export declare const getContextWindowSize: (connector: InferenceConnector) => number | undefined;
/**
 * Retrieve the reasoning effort levels the connector's model supports, as advertised by EIS.
 *
 * @returns The advertised levels, or `undefined` when support is unknown.
 */
export declare const getSupportedReasoningEffortLevels: (connector: InferenceConnector) => string[] | undefined;
/**
 * Checks that the connector's model supports the reasoning effort level, as advertised by EIS.
 * Every level is accepted when support is unknown.
 *
 * @throws {InferenceTaskRequestError} with status 400 when the model does not support
 * `reasoningEffort`.
 */
export declare const validateReasoningEffort: (connector: InferenceConnector, reasoningEffort: ChatCompletionReasoningEffort) => void;
export declare const contextWindowFromModelName: (modelName: string) => number | undefined;
