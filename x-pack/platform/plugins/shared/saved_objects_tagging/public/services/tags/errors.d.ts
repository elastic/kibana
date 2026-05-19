import type { TagValidation } from '../../../common/validation';
/**
 * Error returned from the server when attributes validation fails for `create` or `update` operations
 */
export interface TagServerValidationError {
    statusCode: 400;
    attributes: TagValidation;
}
export declare const isServerValidationError: (error: any) => error is TagServerValidationError;
