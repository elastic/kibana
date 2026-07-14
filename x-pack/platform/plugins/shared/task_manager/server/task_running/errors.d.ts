import { TaskErrorSource } from '../../common';
export { TaskErrorSource };
declare const code: unique symbol;
declare const retry: unique symbol;
declare const source: unique symbol;
export interface DecoratedError extends Error {
    [code]?: string;
    [retry]?: Date | boolean;
    [source]?: TaskErrorSource;
}
export declare function isUnrecoverableError(error: Error | DecoratedError): boolean;
export declare function throwUnrecoverableError(error: Error): void;
export declare function isRetryableError(error: Error | DecoratedError): boolean | Date | null | undefined;
export declare function createRetryableError(error: Error, shouldRetry: Date | boolean): DecoratedError;
export declare function throwRetryableError(error: Error, shouldRetry: Date | boolean): void;
export declare function createTaskRunError(error: Error, errorSource?: TaskErrorSource): DecoratedError;
export declare function getErrorSource(error: Error | DecoratedError): TaskErrorSource | undefined;
export declare function isUserError(error: Error | DecoratedError): boolean;
