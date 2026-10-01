/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeField } from './escape_esql_identifier';

describe('escapeField', () => {
  it('returns a valid bare identifier unchanged', () => {
    expect(escapeField('error_rate')).toBe('error_rate');
  });

  it('leaves a dotted field name unchanged', () => {
    expect(escapeField('error.rate')).toBe('error.rate');
  });

  it('leaves an identifier starting with an underscore unchanged', () => {
    expect(escapeField('_errors')).toBe('_errors');
  });

  it('wraps a label containing a space in backticks', () => {
    expect(escapeField('avg response time')).toBe('`avg response time`');
  });

  it('wraps a label containing a hyphen in backticks', () => {
    expect(escapeField('response-time')).toBe('`response-time`');
  });

  it('wraps a label starting with a digit in backticks', () => {
    expect(escapeField('5xx_rate')).toBe('`5xx_rate`');
  });

  it('wraps an empty label in backticks', () => {
    expect(escapeField('')).toBe('``');
  });
});
