/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseAutorefreshInterval } from '../parse_autorefresh_interval';

describe('parseAutorefreshInterval', () => {
  it('parses a number', () => {
    const result = parseAutorefreshInterval('23', 50);
    expect(result).toBe(23);
  });

  it('returns default value for empty string', () => {
    const result = parseAutorefreshInterval('', 50);
    expect(result).toBe(50);
  });

  it('returns default value for non-numeric string', () => {
    const result = parseAutorefreshInterval('abc', 50);
    expect(result).toBe(50);
  });
});
