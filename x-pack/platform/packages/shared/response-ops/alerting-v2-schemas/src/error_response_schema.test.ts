/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errorResponseSchema } from './error_response_schema';

describe('errorResponseSchema', () => {
  it('accepts a minimal payload with code, error, and message', () => {
    const parsed = errorResponseSchema.parse({
      code: 'RULE_NOT_FOUND',
      error: 'Not Found',
      message: 'Rule "abc-123" not found.',
    });

    expect(parsed).toEqual({
      code: 'RULE_NOT_FOUND',
      error: 'Not Found',
      message: 'Rule "abc-123" not found.',
    });
  });

  it('accepts a payload with optional details', () => {
    const parsed = errorResponseSchema.parse({
      code: 'RULE_NOT_FOUND',
      error: 'Not Found',
      message: 'Rule "abc-123" not found.',
      details: { rule_id: 'abc-123' },
    });

    expect(parsed.details).toEqual({ rule_id: 'abc-123' });
  });

  it('rejects payloads missing required code', () => {
    const result = errorResponseSchema.safeParse({
      error: 'Not Found',
      message: 'Rule not found.',
    });

    expect(result.success).toBe(false);
  });

  it('rejects payloads missing required error', () => {
    const result = errorResponseSchema.safeParse({
      code: 'RULE_NOT_FOUND',
      message: 'Rule not found.',
    });

    expect(result.success).toBe(false);
  });

  it('rejects payloads missing required message', () => {
    const result = errorResponseSchema.safeParse({
      code: 'RULE_NOT_FOUND',
      error: 'Not Found',
    });

    expect(result.success).toBe(false);
  });

  it('rejects payloads with non-string code', () => {
    const result = errorResponseSchema.safeParse({
      code: 404,
      error: 'Not Found',
      message: 'Rule not found.',
    });

    expect(result.success).toBe(false);
  });

  it('allows details to contain arbitrary structured context', () => {
    const result = errorResponseSchema.safeParse({
      code: 'VALIDATION_ERROR',
      error: 'Bad Request',
      message: 'Invalid request body.',
      details: {
        issues: [
          { path: 'body.name', code: 'invalid_type', message: 'Required' },
          { path: 'body.schedule.every', code: 'too_small', message: 'Below minimum' },
        ],
      },
    });

    expect(result.success).toBe(true);
  });
});
