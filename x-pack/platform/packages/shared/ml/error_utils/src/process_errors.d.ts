import type { ErrorType, MLErrorObject } from '@kbn/ml-common-types/errors';
/**
 * Extract properties of the error object from within the response error
 * coming from Kibana, Elasticsearch, and our own ML messages.
 *
 * @param {ErrorType} error
 * @returns {MLErrorObject}
 */
export declare const extractErrorProperties: (error: ErrorType) => MLErrorObject;
/**
 * Extract only the error message within the response error
 * coming from Kibana, Elasticsearch, and our own ML messages.
 *
 * @param {ErrorType} error
 * @returns {string}
 */
export declare const extractErrorMessage: (error: ErrorType) => string;
