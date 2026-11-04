/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidOsqueryVersion } from './osquery_version';

describe('isValidOsqueryVersion', () => {
  it.each(['5', '5.12', '5.19.0', '1', '10.0', '5.0.0'])('accepts %s', (v) => {
    expect(isValidOsqueryVersion(v)).toBe(true);
  });

  it.each(['latest', '5.x', 'v5.19.0', '5.19.0.1', '', ' ', 'abc', '5.', '.5'])(
    'rejects %s',
    (v) => {
      expect(isValidOsqueryVersion(v)).toBe(false);
    }
  );

  it('rejects whitespace-padded values, matching the API codec', () => {
    expect(isValidOsqueryVersion(' 5.10.0')).toBe(false);
    expect(isValidOsqueryVersion('5.19.0 ')).toBe(false);
  });

  it('rejects values longer than the API length cap', () => {
    expect(isValidOsqueryVersion('1'.repeat(64))).toBe(true);
    expect(isValidOsqueryVersion('1'.repeat(65))).toBe(false);
  });
});
