import type { ActionTypeExecutorResult } from '../../types';
export declare enum ActionExecutionErrorReason {
    Validation = "validation",
    Authorization = "authorization"
}
export declare class ActionExecutionError extends Error {
    readonly reason: ActionExecutionErrorReason;
    readonly result: ActionTypeExecutorResult<unknown>;
    constructor(message: string, reason: ActionExecutionErrorReason, result: ActionTypeExecutorResult<unknown>);
}
