/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInferenceProviderError,
  createInferenceRequestAbortedError,
} from '@kbn/inference-common';
import { getRetryFilter } from './error_retry_filter';
import { createToolValidationError } from '../chat_complete/errors';

describe('retry filter', () => {
  describe(`'auto' retry filter`, () => {
    const isRecoverable = getRetryFilter('auto');

    it('returns true for provider error with a recoverable status code', () => {
      const error = createInferenceProviderError('error 500', { status: 500 });
      expect(isRecoverable(error)).toBe(true);
    });

    it('returns false for provider error with a non-recoverable status code', () => {
      const error = createInferenceProviderError('error 400', { status: 400 });
      expect(isRecoverable(error)).toBe(false);
    });

    it('returns true for provider error with an unknown status code', () => {
      const error = createInferenceProviderError('error unknown', { status: undefined });
      expect(isRecoverable(error)).toBe(true);
    });

    it('returns true for tool validation error', () => {
      const error = createToolValidationError('tool validation error', { toolCalls: [] });
      expect(isRecoverable(error)).toBe(true);
    });

    it('returns false for other kind of inference errors', () => {
      const error = createInferenceRequestAbortedError();
      expect(isRecoverable(error)).toBe(false);
    });

    it('returns false for base errors', () => {
      const error = new Error('error');
      expect(isRecoverable(error)).toBe(false);
    });
  });

  describe(`'all' retry filter`, () => {
    const retryAll = getRetryFilter('all');

    it('returns true for any kind of inference error', () => {
      expect(retryAll(createInferenceProviderError('error 500', { status: 500 }))).toBe(true);
      expect(retryAll(createInferenceRequestAbortedError())).toBe(true);
      expect(retryAll(createInferenceProviderError('error 400', { status: 400 }))).toBe(true);
    });

    it('returns true for standard errors', () => {
      const error = new Error('error');
      expect(retryAll(error)).toBe(true);
    });
  });
});
