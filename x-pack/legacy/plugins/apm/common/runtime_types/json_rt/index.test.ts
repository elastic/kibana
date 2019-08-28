/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { jsonRt } from './index';

describe('jsonRt', () => {
  it('validates json', () => {
    expect(jsonRt.decode('{}').isRight()).toBe(true);
    expect(jsonRt.decode('[]').isRight()).toBe(true);
    expect(jsonRt.decode('true').isRight()).toBe(true);
    expect(jsonRt.decode({}).isLeft()).toBe(true);
    expect(jsonRt.decode('foo').isLeft()).toBe(true);
  });

  it('returns parsed json when decoding', () => {
    expect(jsonRt.decode('{}').value).toEqual({});
    expect(jsonRt.decode('[]').value).toEqual([]);
    expect(jsonRt.decode('true').value).toEqual(true);
  });

  it('is pipable', () => {
    const piped = jsonRt.pipe(t.type({ foo: t.string }));

    const validInput = { foo: 'bar' };
    const invalidInput = { foo: null };

    const valid = piped.decode(JSON.stringify(validInput));
    const invalid = piped.decode(JSON.stringify(invalidInput));

    expect(valid.isRight()).toBe(true);
    expect(valid.value).toEqual(validInput);

    expect(invalid.isLeft()).toBe(true);
  });

  it('returns strings when encoding', () => {
    expect(jsonRt.encode({})).toBe('{}');
  });
});
