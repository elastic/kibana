import type Boom from '@hapi/boom';
import type { EsErrorBody, ErrorMessage, MLResponseError } from '@kbn/ml-common-types/errors';
/**
 * Type guard to check if error is of type EsErrorBody
 * @export
 * @param {any} error
 * @returns {error is EsErrorBody}
 */
export declare function isEsErrorBody(error: any): error is EsErrorBody;
/**
 * Type guard to check if error is a string.
 * @export
 * @param {any} error
 * @returns {error is string}
 */
export declare function isErrorString(error: any): error is string;
/**
 * Type guard to check if error is of type ErrorMessage.
 * @export
 * @param {any} error
 * @returns {error is ErrorMessage}
 */
export declare function isErrorMessage(error: any): error is ErrorMessage;
/**
 * Type guard to check if error is of type MLResponseError.
 * @export
 * @param {any} error
 * @returns {error is MLResponseError}
 */
export declare function isMLResponseError(error: any): error is MLResponseError;
/**
 * Type guard to check if error is of type Boom.
 * @export
 * @param {any} error
 * @returns {error is Boom.Boom}
 */
export declare function isBoomError(error: any): error is Boom.Boom;
