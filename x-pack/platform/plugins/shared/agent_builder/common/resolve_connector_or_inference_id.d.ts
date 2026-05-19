export declare const CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_REST = "Cannot specify both connector_id and inference_id.";
export declare const CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW = "Cannot specify both connector-id and inference-id.";
export declare class ConnectorOrInferenceIdConflictError extends Error {
    constructor(message: string);
}
export declare const normalizeOptionalConnectorOrInferenceParam: (value: unknown) => string | undefined;
export interface ResolveConnectorOrInferenceIdParams {
    connectorId?: unknown;
    inferenceId?: unknown;
}
export declare const resolveConnectorOrInferenceId: (params: ResolveConnectorOrInferenceIdParams, conflictMessage?: string) => string | undefined;
