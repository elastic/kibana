/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyError } from './error_utils';

const LIST_TOOL = 'streams_list_streams';

describe('classifyError', () => {
  it('returns not-found message for 404 statusCode', () => {
    const err = Object.assign(new Error('something'), { statusCode: 404 });
    expect(classifyError(err, LIST_TOOL)).toContain('Stream not found');
    expect(classifyError(err, LIST_TOOL)).toContain(LIST_TOOL);
  });

  it('returns not-found message for "not found" in message', () => {
    expect(classifyError(new Error('index not found'), LIST_TOOL)).toContain('Stream not found');
  });

  it('returns not-found message for "Cannot find stream" in message', () => {
    expect(classifyError(new Error('Cannot find stream logs'), LIST_TOOL)).toContain(
      'Stream not found'
    );
  });

  it('returns permissions message for security_exception', () => {
    const result = classifyError(new Error('security_exception: unauthorized'), LIST_TOOL);
    expect(result).toContain('Insufficient index privileges');
  });

  it('returns verification message for verification_exception', () => {
    const result = classifyError(new Error('verification_exception: Unknown column'), LIST_TOOL);
    expect(result).toContain('verification failed');
  });

  it('returns connector message for "No connector available"', () => {
    const result = classifyError(new Error('No connector available'), LIST_TOOL);
    expect(result).toContain('inference connector');
  });

  it('returns generic message for unknown errors', () => {
    expect(classifyError(new Error('something random'), LIST_TOOL)).toBe(
      'Unexpected server error.'
    );
  });

  it('handles non-Error values (string)', () => {
    expect(classifyError('security_exception: unauthorized', LIST_TOOL)).toContain(
      'Insufficient index privileges'
    );
  });

  it('handles non-Error values (plain object) via String coercion', () => {
    expect(classifyError({ message: 'Cannot find stream' }, LIST_TOOL)).toBe(
      'Unexpected server error.'
    );
  });

  it('handles non-Error with toString containing keywords', () => {
    const obj = { toString: () => 'security_exception: forbidden' };
    expect(classifyError(obj, LIST_TOOL)).toContain('Insufficient index privileges');
  });
});
