/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationErrorCode } from '../constants';

// Errors raised by the generation process should provide information through this interface.
export interface GenerationErrorBody {
  message: string;
  attributes: GenerationErrorAttributes;
}

export interface ErrorMessageWithLink {
  link: string;
  linkText: string;
  errorMessage: string;
}

export function isGenerationErrorBody(obj: unknown | undefined): obj is GenerationErrorBody {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof obj.message === 'string' &&
    'attributes' in obj &&
    obj.attributes !== undefined &&
    isGenerationErrorAttributes(obj.attributes)
  );
}

export interface GenerationErrorAttributes {
  errorCode: GenerationErrorCode;
  underlyingMessages?: string[] | undefined;
  logFormat?: string | undefined;
  errorMessageWithLink?: ErrorMessageWithLink | undefined;
}

export function isGenerationErrorAttributes(obj: unknown): obj is GenerationErrorAttributes {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'errorCode' in obj &&
    typeof obj.errorCode === 'string' &&
    (!('underlyingMessages' in obj) || Array.isArray(obj.underlyingMessages))
  );
}
