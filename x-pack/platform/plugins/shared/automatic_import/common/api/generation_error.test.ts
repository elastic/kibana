/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenerationErrorCode } from '../constants';
import { isGenerationErrorBody } from './generation_error';
import type { GenerationErrorBody } from './generation_error';

describe('isGenerationErrorBody', () => {
  it('should return true for a valid GenerationErrorBody object', () => {
    const validErrorBody: GenerationErrorBody = {
      message: 'An error occurred',
      attributes: {
        errorCode: GenerationErrorCode.CEF_ERROR,
        underlyingMessages: ['Error message 1', 'Error message 2'],
      },
    };

    expect(isGenerationErrorBody(validErrorBody)).toBe(true);
  });

  it('should return false for an object without a message', () => {
    const invalidErrorBody = {
      attributes: {
        errorCode: 'ERROR_CODE',
        underlyingMessages: ['Error message 1', 'Error message 2'],
      },
    };

    expect(isGenerationErrorBody(invalidErrorBody)).toBe(false);
  });

  it('should return false for an object without attributes', () => {
    const invalidErrorBody = {
      message: 'An error occurred',
    };

    expect(isGenerationErrorBody(invalidErrorBody)).toBe(false);
  });

  it('should return false for an object with invalid attributes', () => {
    const invalidErrorBody = {
      message: 'An error occurred',
      attributes: {
        errorCode: 123, // errorCode should be a string
        underlyingMessages: 'Error message', // underlyingMessages should be an array
      },
    };

    expect(isGenerationErrorBody(invalidErrorBody)).toBe(false);
  });

  it('should return false for a non-object value', () => {
    expect(isGenerationErrorBody(null)).toBe(false);
    expect(isGenerationErrorBody(undefined)).toBe(false);
    expect(isGenerationErrorBody('string')).toBe(false);
    expect(isGenerationErrorBody(123)).toBe(false);
    expect(isGenerationErrorBody(true)).toBe(false);
  });
});
