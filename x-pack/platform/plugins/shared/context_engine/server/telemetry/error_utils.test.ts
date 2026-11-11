/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { errorTypeForTelemetry } from './error_utils';

describe('errorTypeForTelemetry', () => {
  it('returns the ExecutionError type', () => {
    const error = new ExecutionError({ type: 'PermissionError', message: 'denied' });
    expect(errorTypeForTelemetry(error)).toBe('PermissionError');
  });

  it('returns the error name for other errors', () => {
    expect(errorTypeForTelemetry(new AiIndexNotFoundError('missing'))).toBe('AiIndexNotFoundError');
    expect(errorTypeForTelemetry(new TypeError('boom'))).toBe('TypeError');
  });

  it('returns "unknown" for non-errors', () => {
    expect(errorTypeForTelemetry('boom')).toBe('unknown');
  });
});
