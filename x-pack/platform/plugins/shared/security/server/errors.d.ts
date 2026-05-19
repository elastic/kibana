import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import type { CustomHttpResponseOptions, ResponseError } from '@kbn/core/server';
export declare function wrapError(error: any): Boom.Boom<unknown>;
/**
 * Wraps error into error suitable for Core's custom error response.
 * @param error Any error instance.
 */
export declare function wrapIntoCustomErrorResponse(error: any): CustomHttpResponseOptions<ResponseError>;
/**
 * Extracts error code from Boom and Elasticsearch "native" errors.
 * @param error Error instance to extract status code from.
 */
export declare function getErrorStatusCode(error: any): number;
/**
 * Extracts detailed error message from Boom and Elasticsearch "native" errors. It's supposed to be
 * only logged on the server side and never returned to the client as it may contain sensitive
 * information.
 * @param error Error instance to extract message from.
 */
export declare function getDetailedErrorMessage(error: any): string;
export declare function isExpiredOrInvalidRefreshTokenError(error: errors.ResponseError): boolean;
export declare function isCredentialMismatchError(error: errors.ResponseError): boolean;
export declare class InvalidGrantError extends Error {
    constructor(message: string);
    static expiredOrInvalidRefreshToken(): InvalidGrantError;
    static credentialMismatch(): InvalidGrantError;
}
