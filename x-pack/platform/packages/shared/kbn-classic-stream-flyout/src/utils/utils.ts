/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';

export const formatDataRetention = (template: TemplateDeserialized): string | undefined => {
  const { lifecycle } = template;

  if (!lifecycle?.enabled) {
    return undefined;
  }

  if (lifecycle.infiniteDataRetention) {
    return '∞';
  }

  if (lifecycle.value && lifecycle.unit) {
    return `${lifecycle.value}${lifecycle.unit}`;
  }

  return undefined;
};

/**
 * Checks if a stream name has unfilled wildcards (contains *)
 */
export const hasEmptyWildcards = (streamName: string): boolean => {
  return streamName.includes('*');
};

/**
 * Validation error types for stream name validation
 */
export type ValidationErrorType = 'empty' | 'duplicate' | 'higherPriority' | null;

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
  signal?: AbortSignal
) => Promise<{
  errorType: 'duplicate' | 'higherPriority' | null;
  conflictingIndexPattern?: string;
}>;

/**
 * Validates a stream name by checking for empty wildcards and running async validation.
 * Returns the validation result with error type and optional conflicting pattern.
 * Throws an error if the validation was aborted.
 */
export const validateStreamName = async (
  streamName: string,
  onValidate?: StreamNameValidator,
  signal?: AbortSignal
): Promise<StreamNameValidationResult> => {
  // First, check for empty wildcards (local validation)
  if (hasEmptyWildcards(streamName)) {
    return { errorType: 'empty' };
  }

  // Run the external validator if provided
  if (onValidate) {
    const result = await onValidate(streamName, signal);

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
