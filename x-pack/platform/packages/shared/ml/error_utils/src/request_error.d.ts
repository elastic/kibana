import type { MLErrorObject, ErrorType } from '@kbn/ml-common-types/errors';
/**
 * ML Request Failure
 *
 * @export
 * @class MLRequestFailure
 * @typedef {MLRequestFailure}
 * @extends {Error}
 */
export declare class MLRequestFailure extends Error {
    /**
     * Creates an instance of MLRequestFailure.
     *
     * @constructor
     * @param {MLErrorObject} error
     * @param {ErrorType} resp
     */
    constructor(error: MLErrorObject, resp: ErrorType);
}
