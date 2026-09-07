/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIndexNotFoundError } from './is_index_not_found_error';

describe('isIndexNotFoundError', () => {
  it('returns true for error with caused_by.type = index_not_found_exception', () => {
    const error = {
      attributes: {
        caused_by: {
          type: 'index_not_found_exception',
        },
      },
    };
    expect(isIndexNotFoundError(error)).toBe(true);
  });

  it('returns true for error with error.caused_by.type = index_not_found_exception', () => {
    const error = {
      attributes: {
        error: {
          caused_by: {
            type: 'index_not_found_exception',
          },
        },
      },
    };
    expect(isIndexNotFoundError(error)).toBe(true);
  });

  it('returns false for other error types', () => {
    const error = {
      attributes: {
        caused_by: {
          type: 'some_other_exception',
        },
      },
    };
    expect(isIndexNotFoundError(error)).toBe(false);
  });

  it('returns false for error without attributes', () => {
    const error = new Error('Regular error');
    expect(isIndexNotFoundError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isIndexNotFoundError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isIndexNotFoundError(undefined)).toBe(false);
  });

  it('returns true for error with meta.body.error.type = index_not_found_exception', () => {
    const error = {
      meta: {
        body: {
          error: {
            type: 'index_not_found_exception',
          },
        },
      },
    };
    expect(isIndexNotFoundError(error)).toBe(true);
  });

  it('returns true for error with message containing index_not_found_exception', () => {
    const error = {
      message: 'index_not_found_exception: no such index [.chat-tools]',
    };
    expect(isIndexNotFoundError(error)).toBe(true);
  });

  it('returns false for primitive values', () => {
    expect(isIndexNotFoundError('string')).toBe(false);
    expect(isIndexNotFoundError(123)).toBe(false);
    expect(isIndexNotFoundError(true)).toBe(false);
  });
});
