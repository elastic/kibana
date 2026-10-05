/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft, isRight } from 'fp-ts/Either';
import { osqueryVersionString, packQueryRecordRt } from './shared_schemas';

describe('osqueryVersionString codec', () => {
  const decode = (v: unknown) => osqueryVersionString.decode(v);

  it('accepts empty string (no constraint)', () => {
    expect(isRight(decode(''))).toBe(true);
  });

  it.each(['5', '5.12', '5.19.0', '10.0.1'])('accepts valid numeric version %s', (v) => {
    expect(isRight(decode(v))).toBe(true);
  });

  it.each(['latest', '5.x', 'v5.19.0', '5.19.0.1'])('rejects non-numeric string %s', (v) => {
    expect(isRight(decode(v))).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isRight(decode(123))).toBe(false);
    expect(isRight(decode(null))).toBe(false);
    expect(isRight(decode(undefined))).toBe(false);
  });

  it('names the offending field path in the error message', () => {
    const result = packQueryRecordRt.decode({ q1: { query: 'select 1;', version: '5.x' } });
    expect(isLeft(result) && result.left[0].message).toBe(
      'q1.version: "5.x" must be empty or a numeric version string (e.g. "5.19.0")'
    );
  });

  it('rejects strings exceeding 64 characters', () => {
    expect(isRight(decode('5'.repeat(65)))).toBe(false);
  });
});
