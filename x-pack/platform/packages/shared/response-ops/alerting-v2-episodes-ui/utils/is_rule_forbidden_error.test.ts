/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuleForbiddenError } from './is_rule_forbidden_error';

describe('isRuleForbiddenError', () => {
  it('returns true for a 403 response', () => {
    expect(
      isRuleForbiddenError({
        response: { status: 403 },
        body: { code: 'FORBIDDEN', error: 'Forbidden', message: 'Forbidden' },
      })
    ).toBe(true);
  });

  it('returns false for non-403 errors', () => {
    expect(
      isRuleForbiddenError({
        response: { status: 404 },
        body: { code: 'RULE_NOT_FOUND', error: 'Not Found', message: 'Rule not found' },
      })
    ).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRuleForbiddenError(undefined)).toBe(false);
  });
});
