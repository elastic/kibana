/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIterationIndex } from './parse_iteration_index';

describe('parseIterationIndex', () => {
  it('parses foreach iteration-{n} step ids', () => {
    expect(parseIterationIndex('iteration-0')).toBe(0);
    expect(parseIterationIndex('iteration-12')).toBe(12);
  });

  it('parses while bare-index step ids', () => {
    expect(parseIterationIndex('0')).toBe(0);
    expect(parseIterationIndex('7')).toBe(7);
  });

  it('returns NaN for non-ordinal step ids', () => {
    expect(parseIterationIndex('log')).toBeNaN();
    expect(parseIterationIndex('iteration-')).toBeNaN();
  });
});
