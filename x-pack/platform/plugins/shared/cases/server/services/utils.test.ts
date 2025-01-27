/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { bulkDecodeSOAttributes } from './utils';

describe('bulkDecodeSOAttributes', () => {
  const typeToTest = rt.type({ foo: rt.string });

  it('decodes a valid SO correctly', () => {
    const savedObjects = [{ id: '1', attributes: { foo: 'test' } }];
    const res = bulkDecodeSOAttributes([{ id: '1', attributes: { foo: 'test' } }], typeToTest);

    expect(res.get('1')).toEqual(savedObjects[0].attributes);
  });

  it('throws an error when SO is not valid', () => {
    // @ts-expect-error
    expect(() => bulkDecodeSOAttributes([{ id: '1', attributes: {} }], typeToTest)).toThrowError(
      'Invalid value "undefined" supplied to "foo"'
    );
  });
});
