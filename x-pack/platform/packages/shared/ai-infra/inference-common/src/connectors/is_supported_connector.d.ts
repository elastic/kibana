import type { RawInferenceConnector, RawConnector } from './connectors';
import { InferenceConnectorType } from './connectors';
export declare const COMPLETION_TASK_TYPE = "chat_completion";
/**
 * Checks if a given connector type is compatible for inference.
 *
 * Note: this check is not sufficient to assert if a given connector can be
 * used for inference, as `.inference` connectors need additional check logic.
 * Please use `isSupportedConnector` instead when possible.
 */
export declare function isSupportedConnectorType(id: string): id is InferenceConnectorType;
/**
 * Checks if a given connector is compatible for inference.
 *
 * A connector is compatible if:
 * 1. its type is in the list of allowed types
 * 2. for inference connectors, if its taskType is "chat_completion"
 */
export declare function isSupportedConnector(connector: RawConnector): connector is RawInferenceConnector;
