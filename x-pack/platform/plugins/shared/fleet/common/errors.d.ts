import type { FleetErrorType } from './types';
export declare class FleetError<TMeta = unknown> extends Error {
    readonly meta?: TMeta | undefined;
    attributes?: {
        type: FleetErrorType;
    };
    constructor(message?: string, meta?: TMeta | undefined);
}
export declare class FleetVersionConflictError extends FleetError {
}
export declare class PolicyNamespaceValidationError extends FleetError {
}
export declare class PackagePolicyValidationError extends FleetError {
}
export declare class MessageSigningError extends FleetError {
}
export declare class FleetActionsError extends FleetError {
}
export declare class FleetActionsClientError extends FleetError {
}
export declare class UninstallTokenError extends FleetError {
}
export declare class AgentRequestInvalidError extends FleetError {
}
export declare class OutputInvalidError extends FleetError {
}
export declare class AgentlessAgentCreateFleetUnreachableError extends FleetError {
    constructor(message: string);
}
export declare class AgentlessAgentCreateOverProvisionedError extends FleetError<{
    limit?: number;
}> {
    constructor(message: string, limit?: number);
}
export declare class PackageDependencyError extends FleetError {
}
