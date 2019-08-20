/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { json } from './index';

describe('json', () => {
  it('validates json', () => {
    expect(json.decode('{}').isRight()).toBe(true);
    expect(json.decode('[]').isRight()).toBe(true);
    expect(json.decode('true').isRight()).toBe(true);

    expect(json.decode({}).isLeft()).toBe(true);
    expect(json.decode('foo').isLeft()).toBe(true);
  });

  it('returns parsed json', () => {
    expect(json.decode('{}').value).toEqual({});
    expect(json.decode('[]').value).toEqual([]);
    expect(json.decode('true').value).toEqual(true);
  });

  it('is pipable', () => {
    const piped = json.pipe(t.type({ foo: t.string }));

    const validInput = { foo: 'bar' };
    const invalidInput = { foo: null };

    const valid = piped.decode(JSON.stringify(validInput));
    const invalid = piped.decode(JSON.stringify(invalidInput));

    expect(valid.isRight()).toBe(true);
    expect(valid.value).toEqual(validInput);

    expect(invalid.isLeft()).toBe(true);
  });
});
