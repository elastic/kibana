/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHexColor } from './utils';

describe('isHexColor', () => {
  it('returns true for valid 3-length hex colors', () => {
    expect(isHexColor('#FEC')).toBe(true);
    expect(isHexColor('#0a4')).toBe(true);
  });

  it('returns true for valid 6-length hex colors', () => {
    expect(isHexColor('#FF00CC')).toBe(true);
    expect(isHexColor('#fab47e')).toBe(true);
  });

  it('returns false for other strings', () => {
    expect(isHexColor('#FAZ')).toBe(false);
    expect(isHexColor('#FFAAUU')).toBe(false);
    expect(isHexColor('foobar')).toBe(false);
  });
});
