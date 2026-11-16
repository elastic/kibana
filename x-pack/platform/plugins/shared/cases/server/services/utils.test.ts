/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { bulkDecodeSOAttributes } from './utils';

describe('bulkDecodeSOAttributes', () => {
  const schemaToTest = z.object({ foo: z.string() });

  it('decodes a valid SO correctly', () => {
    const savedObjects = [{ id: '1', attributes: { foo: 'test' } }];
    const res = bulkDecodeSOAttributes([{ id: '1', attributes: { foo: 'test' } }], schemaToTest);

    expect(res.get('1')).toEqual(savedObjects[0].attributes);
  });

  it('throws an error when SO is not valid', () => {
    expect(() => bulkDecodeSOAttributes([{ id: '1', attributes: {} }], schemaToTest)).toThrowError(
      'foo: Invalid input: expected string, received undefined'
    );
  });
});
