import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
/**
 * Checks if a stream name has unfilled wildcards (contains *)
 */
export declare const hasEmptyWildcards: (streamName: string) => boolean;
/**
 * Checks if a data stream name has an invalid format according to Elasticsearch naming rules.
 *
 * Rules:
 * - Cannot include: \, /, *, ?, ", <, >, |, ,, #, :, or a space character
 * - Cannot start with: -, _, +, or .ds-
 * - Cannot be: . or ..
 *
 * @param streamName The data stream name to validate
 * @returns true if the stream name format is INVALID, false if valid
 */
export declare const hasInvalidFormat: (streamName: string) => boolean;
/**
 * Validation error types for stream name validation
 */
export type ValidationErrorType = 'empty' | 'invalidFormat' | 'duplicate' | 'higherPriority' | null;
/**
 * Result from stream name validation
 */
export interface StreamNameValidationResult {
    /** The type of error, or null if valid */
    errorType: ValidationErrorType;
    /** For higherPriority errors, the conflicting index pattern */
    conflictingIndexPattern?: string;
}
/**
 * Async validator function type for external validation (duplicate/priority checks)
 */
export type StreamNameValidator = (streamName: string, selectedTemplate: IndexTemplate, signal?: AbortSignal) => Promise<{
    errorType: 'duplicate' | 'higherPriority' | null;
    conflictingIndexPattern?: string;
}>;
/**
 * Validates a stream name by checking for empty strings, wildcards, format, and running async validation.
 * Returns the validation result with error type and optional conflicting index pattern.
 * Throws an error if the validation was aborted.
 */
export declare const validateStreamName: (streamName: string, selectedTemplate: IndexTemplate, onValidate?: StreamNameValidator, signal?: AbortSignal) => Promise<StreamNameValidationResult>;
