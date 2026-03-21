import type { ErrorResult, OtherResult } from '@kbn/agent-builder-common';
/**
 * Generate a random id which can be used for tool result id.
 */
export declare function getToolResultId(): string;
/**
 * Check if the provided string is a valid tool result id.
 */
export declare function isToolResultId(id: string): boolean;
export declare const createErrorResult: (message: string | ErrorResult["data"]) => ErrorResult;
export declare const createOtherResult: <T extends Object>(data: T) => OtherResult<T>;
