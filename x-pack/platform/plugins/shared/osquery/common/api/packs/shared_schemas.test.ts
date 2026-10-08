/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft, isRight } from 'fp-ts/Either';
import {
  nonEmptyOsqueryVersionString,
  osqueryVersionString,
  packQueryRecordRt,
} from './shared_schemas';
import { createPackRequestBodySchema } from './create_pack_route';
import { updatePacksRequestBodySchema } from './update_packs_route';

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

  it('keeps a numeric query id in the error path', () => {
    const result = packQueryRecordRt.decode({ '1': { query: 'select 1;', version: '5.x' } });
    expect(isLeft(result) && result.left[0].message).toBe(
      '1.version: "5.x" must be empty or a numeric version string (e.g. "5.19.0")'
    );
  });

  it('rejects strings exceeding 64 characters', () => {
    expect(isRight(decode('5'.repeat(65)))).toBe(false);
  });

  it('names the field path when the value exceeds the length cap', () => {
    const result = packQueryRecordRt.decode({
      q1: { query: 'select 1;', version: '1'.repeat(65) },
    });
    expect(isLeft(result) && result.left[0].message).toBe(
      'q1.version: string must not exceed 64 characters'
    );
  });

  it('names the field path when the value is not a string', () => {
    const result = packQueryRecordRt.decode({ q1: { query: 'select 1;', version: null } });
    expect(isLeft(result) && result.left[0].message).toBe('q1.version: expected string');
  });

  it('rejects a whitespace-padded version', () => {
    expect(isRight(decode(' 5.10.0'))).toBe(false);
  });
});

describe('nonEmptyOsqueryVersionString codec', () => {
  const decode = (v: unknown) => nonEmptyOsqueryVersionString.decode(v);

  it.each(['5', '5.12', '5.19.0'])('accepts valid numeric version %s', (v) => {
    expect(isRight(decode(v))).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isRight(decode(''))).toBe(false);
  });

  it('does not offer "empty" as a valid alternative in the error message', () => {
    const result = createPackRequestBodySchema.decode({
      name: 'p',
      queries: {},
      min_osquery_version: 'latest',
    });
    expect(isLeft(result) && result.left[0].message).toBe(
      'min_osquery_version: "latest" must be a numeric version string (e.g. "5.19.0")'
    );
  });

  it('names the field inside the nullable update union', () => {
    const result = updatePacksRequestBodySchema.decode({ min_osquery_version: '' });
    expect(isLeft(result) && result.left[0].message).toBe(
      'min_osquery_version: "" must be a numeric version string (e.g. "5.19.0")'
    );
  });
});
