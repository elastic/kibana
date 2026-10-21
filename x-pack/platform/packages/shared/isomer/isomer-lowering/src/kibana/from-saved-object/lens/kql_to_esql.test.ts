/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeField } from './esql';
import { translateKqlToEsql } from './kql_to_esql';

const translate = (query: string): string | undefined => translateKqlToEsql(query, escapeField);

describe('translateKqlToEsql', () => {
  it('lowers numeric range comparisons via TO_DOUBLE', () => {
    expect(translate('response.keyword >= 400')).toBe('TO_DOUBLE(`response.keyword`) >= 400');
    expect(translate('bytes < 1000')).toBe('TO_DOUBLE(bytes) < 1000');
  });

  it('combines comparisons with and/or, honoring precedence', () => {
    expect(translate('response.keyword >= 200 and response.keyword < 400')).toBe(
      '(TO_DOUBLE(`response.keyword`) >= 200 AND TO_DOUBLE(`response.keyword`) < 400)'
    );
    expect(translate('a > 1 or b > 2')).toBe('(TO_DOUBLE(a) > 1 OR TO_DOUBLE(b) > 2)');
  });

  it('treats `:` as equality, quoting non-numeric values', () => {
    expect(translate('extension.keyword: "css"')).toBe('`extension.keyword` == "css"');
    expect(translate('status: 200')).toBe('TO_DOUBLE(status) == 200');
  });

  it('escapes string literals through shared ES|QL helpers', () => {
    expect(translate('message: "can\\"t \\\\ fail"')).toBe('message == "can\\"t \\\\ fail"');
  });

  it('preserves boolean literals', () => {
    expect(translate('FlightDelay: true')).toBe('FlightDelay == true');
    expect(translate('Cancelled: false')).toBe('Cancelled == false');
  });

  it('supports not and parentheses', () => {
    expect(translate('not (status: 200)')).toBe('NOT (TO_DOUBLE(status) == 200)');
  });

  it('matches everything for an empty query', () => {
    expect(translate('')).toBe('true');
    expect(translate('   ')).toBe('true');
  });

  it('returns undefined for unsupported constructs', () => {
    expect(translate('error')).toBeUndefined(); // bare full-text term
    expect(translate('message: foo*')).toBeUndefined(); // wildcard
    expect(translate('status >=')).toBeUndefined(); // missing value
    expect(translate('(status: 200')).toBeUndefined(); // unbalanced paren
  });
});
