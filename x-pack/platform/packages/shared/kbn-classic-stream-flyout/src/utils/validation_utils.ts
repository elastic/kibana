/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';

/**
 * Checks if a stream name has unfilled wildcards (contains *)
 */
export const hasEmptyWildcards = (streamName: string): boolean => {
  return streamName.includes('*');
};

/**
 * Characters that are not allowed in data stream names
 */
const INVALID_CHARACTERS = ['\\', '/', '*', '?', '"', '<', '>', '|', ',', '#', ':', ' '];

/**
 * Prefixes that data stream names cannot start with
 */
const INVALID_PREFIXES = ['-', '_', '+', '.ds-'];

/**
 * Reserved names that cannot be used as data stream names
 */
const RESERVED_NAMES = ['.', '..'];

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
export const hasInvalidFormat = (streamName: string): boolean => {
  // Check for reserved names
  if (RESERVED_NAMES.includes(streamName)) {
    return true;
  }

  // Check for invalid prefixes
  for (const prefix of INVALID_PREFIXES) {
    if (streamName.startsWith(prefix)) {
      return true;
    }
  }

  // Check for invalid characters
  for (const char of INVALID_CHARACTERS) {
    if (streamName.includes(char)) {
      return true;
    }
  }

  return false;
};

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

  // Check for invalid format
  if (hasInvalidFormat(streamName)) {
    return { errorType: 'invalidFormat' };
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
