import type { TagValidation } from '../../../common';
/**
 * Error returned from {@link TagsClient#create} or {@link TagsClient#update} when tag
 * validation failed.
 */
export declare class TagValidationError extends Error {
    readonly validation: TagValidation;
    constructor(message: string, validation: TagValidation);
}
