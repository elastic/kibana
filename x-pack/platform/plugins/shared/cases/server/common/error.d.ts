import { Boom } from '@hapi/boom';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { DecoratedError } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/core/server';
import type { CaseErrorResponse, SOWithErrors } from './types';
export interface HTTPError extends Error {
    statusCode: number;
}
/**
 * Helper class for wrapping errors while preserving the original thrown error.
 */
export declare class CaseError extends Error {
    readonly wrappedError?: Error;
    constructor(message?: string, originalError?: Error);
    /**
     * This function creates a boom representation of the error. If the wrapped error is a boom we'll grab the statusCode
     * and data from that.
     */
    boomify(): Boom<unknown>;
}
/**
 * Type guard for determining if an error is a CaseError
 */
export declare function isCaseError(error: unknown): error is CaseError;
/**
 * Type guard for determining if an error is an HTTPError
 */
export declare function isHTTPError(error: unknown): error is HTTPError;
/**
 * Create a CaseError that wraps the original thrown error. This also logs the message that will be placed in the CaseError
 * if the logger was defined.
 */
export declare function createCaseError({ message, error, logger, }: {
    message?: string;
    error?: Error;
    logger?: Logger;
}): CaseError;
export declare const isSOError: <T>(so: {
    error?: unknown;
}) => so is SOWithErrors<T>;
export declare const isSODecoratedError: (error: SavedObjectError | DecoratedError) => error is DecoratedError;
export declare const createCaseErrorFromSOError: (error: SavedObjectError | DecoratedError, message: string) => CaseError;
export declare const generateCaseErrorResponse: (error: SavedObjectError | DecoratedError) => CaseErrorResponse;
