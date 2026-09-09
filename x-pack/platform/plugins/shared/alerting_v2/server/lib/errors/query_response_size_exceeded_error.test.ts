/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_RESPONSE_SIZE_SETTING,
  QueryResponseSizeExceededError,
  toQueryResponseSizeExceededError,
} from './query_response_size_exceeded_error';

describe('QueryResponseSizeExceededError', () => {
  it('names the limit, the setting and the fix', () => {
    const error = new QueryResponseSizeExceededError(10 * 1024 * 1024);

    expect(error.message).toContain('ES|QL query response exceeded the maximum allowed size');
    expect(error.message).toContain('10mb');
    expect(error.message).toContain(MAX_RESPONSE_SIZE_SETTING);
    expect(error.message).toContain('KEEP');
    expect(error.message).toContain('STATS');
    expect(error.maxResponseSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('falls back to naming the setting when the limit is unknown', () => {
    const error = new QueryResponseSizeExceededError();

    expect(error.message).toContain(`configured by ${MAX_RESPONSE_SIZE_SETTING}`);
    expect(error.maxResponseSizeBytes).toBeUndefined();
  });

  it('keeps the original transport error as the cause', () => {
    const cause = new Error('The content length (52428801) is bigger than the maximum allowed');
    const error = toQueryResponseSizeExceededError(cause, 50 * 1024 * 1024);

    expect(error).toBeInstanceOf(QueryResponseSizeExceededError);
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('50mb');
  });
});
