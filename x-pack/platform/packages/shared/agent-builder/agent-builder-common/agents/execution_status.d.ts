import type { AgentBuilderErrorCode } from '../base/errors';
export declare enum ExecutionStatus {
    scheduled = "scheduled",
    running = "running",
    completed = "completed",
    failed = "failed",
    aborted = "aborted"
}
/**
 * Serialized error stored in the execution document when the execution fails.
 */
export interface SerializedExecutionError {
    /** The error code. */
    code: AgentBuilderErrorCode;
    /** Human-readable error message. */
    message: string;
    /** Optional metadata associated with the error. */
    meta?: Record<string, any>;
}
