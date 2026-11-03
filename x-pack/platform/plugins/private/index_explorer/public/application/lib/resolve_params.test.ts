/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveParams } from './resolve_params';

describe('resolveParams', () => {
  it('combines declared params, detected placeholders, URL values and defaults', () => {
    expect(
      resolveParams(
        'FROM logs | WHERE a == ?a AND b == ?b AND c == ?c',
        [{ name: 'b', type: 'number', defaultValue: '1' }],
        { a: 'x', c: 'true' },
        { c: 'boolean', b: 'string' }
      )
    ).toEqual([
      { name: 'b', type: 'number', value: '1' },
      { name: 'a', type: 'string', value: 'x' },
      { name: 'c', type: 'boolean', value: 'true' },
    ]);
  });
});
