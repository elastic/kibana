/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getScopedQueryErrorAttributes,
  getScopedQueryErrorMessage,
  isScopedQueryError,
  isScopedQueryErrorAttributes,
} from './maintenance_window_scoped_query_error_message';

describe('getScopedQueryErrorMessage', () => {
  it('prepends the identifier', () => {
    expect(getScopedQueryErrorMessage('bad kql')).toBe('invalid scope - bad kql');
  });
});

describe('isScopedQueryError', () => {
  it('returns true for messages containing the identifier', () => {
    expect(isScopedQueryError('invalid scope - something')).toBe(true);
  });

  it('returns false for unrelated messages', () => {
    expect(isScopedQueryError('something else went wrong')).toBe(false);
  });
});

describe('getScopedQueryErrorAttributes', () => {
  it('returns a ScopedQueryErrorAttributes with the given scope and message', () => {
    const result = getScopedQueryErrorAttributes('alerting', 'some parse error');
    expect(result).toEqual({ scopeErrors: [{ scope: 'alerting', message: 'some parse error' }] });
  });

  it('works for alertingV2', () => {
    const result = getScopedQueryErrorAttributes('alertingV2', 'v2 parse error');
    expect(result).toEqual({ scopeErrors: [{ scope: 'alertingV2', message: 'v2 parse error' }] });
  });
});

describe('isScopedQueryErrorAttributes', () => {
  it('accepts a valid alerting payload', () => {
    expect(
      isScopedQueryErrorAttributes({ scopeErrors: [{ scope: 'alerting', message: 'err' }] })
    ).toBe(true);
  });

  it('accepts a valid alertingV2 payload', () => {
    expect(
      isScopedQueryErrorAttributes({ scopeErrors: [{ scope: 'alertingV2', message: 'err' }] })
    ).toBe(true);
  });

  it('rejects undefined', () => {
    expect(isScopedQueryErrorAttributes(undefined)).toBe(false);
  });

  it('rejects null', () => {
    expect(isScopedQueryErrorAttributes(null)).toBe(false);
  });

  it('rejects an empty object', () => {
    expect(isScopedQueryErrorAttributes({})).toBe(false);
  });

  it('rejects when scopeErrors is not an array', () => {
    expect(isScopedQueryErrorAttributes({ scopeErrors: 'alerting' })).toBe(false);
  });

  it('rejects an empty scopeErrors array', () => {
    expect(isScopedQueryErrorAttributes({ scopeErrors: [] })).toBe(false);
  });

  it('rejects an unknown scope literal', () => {
    expect(
      isScopedQueryErrorAttributes({ scopeErrors: [{ scope: 'unknown', message: 'err' }] })
    ).toBe(false);
  });

  it('rejects when a scope entry is missing the scope key', () => {
    expect(isScopedQueryErrorAttributes({ scopeErrors: [{ message: 'err' }] })).toBe(false);
  });
});
