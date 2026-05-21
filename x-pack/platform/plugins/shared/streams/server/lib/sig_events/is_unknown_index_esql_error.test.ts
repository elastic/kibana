/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnknownIndexEsqlError } from './is_unknown_index_esql_error';

describe('isUnknownIndexEsqlError', () => {
  it('returns true for verification_exception with Unknown index in the message', () => {
    const error = new Error(
      'verification_exception Root causes: verification_exception: Unknown index [.significant_events-knowledge_indicators]'
    );
    expect(isUnknownIndexEsqlError(error)).toBe(true);
  });

  it('returns true for index_not_found_exception in the message', () => {
    expect(isUnknownIndexEsqlError(new Error('index_not_found_exception'))).toBe(true);
  });

  it('returns true for index_not_found_exception in the error body', () => {
    expect(
      isUnknownIndexEsqlError({
        body: { error: { type: 'index_not_found_exception' } },
      })
    ).toBe(true);
  });

  it('returns true for 404 responses that mention an index', () => {
    expect(
      isUnknownIndexEsqlError({
        statusCode: 404,
        message: 'index [.significant_events-knowledge_indicators] not found',
      })
    ).toBe(true);
  });

  it('returns false for other verification errors', () => {
    expect(
      isUnknownIndexEsqlError(
        new Error('verification_exception: Unknown column [nonexistent.field]')
      )
    ).toBe(false);
  });

  it('returns false for unrelated errors', () => {
    expect(isUnknownIndexEsqlError(new Error('security_exception'))).toBe(false);
  });
});
