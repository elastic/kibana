/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
import { validateStreamName as validateSchemaStreamName } from '@kbn/streams-schema';

/**
 * Checks if a stream name has unfilled wildcards (contains *)
 */
export const hasEmptyWildcards = (streamName: string): boolean => {
  return streamName.includes('*');
};

/**
 * Validation error types for stream name validation
 */
export type ValidationErrorType =
  | 'empty'
  | 'invalidFormat'
  | 'uppercase'
  | 'tooLong'
  | 'duplicate'
  | 'higherPriority'
  | null;

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
export type StreamNameValidator = (
  streamName: string,
  selectedTemplate: IndexTemplate,
  signal?: AbortSignal
) => Promise<{
  errorType: 'duplicate' | 'higherPriority' | null;
  conflictingIndexPattern?: string;
}>;

/**
 * Validates a stream name by checking for empty strings, wildcards, format, and running async validation.
 * Returns the validation result with error type and optional conflicting index pattern.
 * Throws an error if the validation was aborted.
 */
export const validateStreamName = async (
  streamName: string,
  selectedTemplate: IndexTemplate,
  onValidate?: StreamNameValidator,
  signal?: AbortSignal
): Promise<StreamNameValidationResult> => {
  // Check for empty string or wildcards
  if (streamName === '' || hasEmptyWildcards(streamName)) {
    return { errorType: 'empty' };
  }

  // Validate stream name against Elasticsearch naming requirements
  const schemaValidation = validateSchemaStreamName(streamName);
  if (!schemaValidation.valid) {
    switch (schemaValidation.error) {
      case 'tooLong':
        return { errorType: 'tooLong' };
      case 'uppercase':
        return { errorType: 'uppercase' };
      case 'invalidCharacter':
      case 'invalidPrefix':
      case 'reservedName':
        return { errorType: 'invalidFormat' };
      case 'empty':
      default:
        // Should already be caught above, but keep it defensive
        return { errorType: 'empty' };
    }
  }

  // Run the external validator if provided
  if (onValidate) {
    const result = await onValidate(streamName, selectedTemplate, signal);

    if (result.errorType === 'duplicate') {
      return { errorType: 'duplicate' };
    } else if (result.errorType === 'higherPriority') {
      return {
        errorType: 'higherPriority',
        conflictingIndexPattern: result.conflictingIndexPattern,
      };
    }
  }

  // All validations passed
  return { errorType: null };
};
